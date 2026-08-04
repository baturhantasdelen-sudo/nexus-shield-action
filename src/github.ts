import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { scanContent, ScanIssue } from './scanner';

export interface ScanResult {
  totalLeaks: number;
  leakSummary: Record<string, number>;
  issuesByFile: Map<string, ScanIssue[]>;
}

export interface ChangedFile {
  filename: string;
  status: string;
  patch?: string;
  content?: string;
}

const COMMENT_MARKER = '<!-- nexus-shield-security-gatekeeper -->';

export async function getPullRequestChangedFiles(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<ChangedFile[]> {
  const octokit = github.getOctokit(token);
  const files: ChangedFile[] = [];
  let page = 1;

  while (true) {
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    });

    for (const file of response.data) {
      if (file.status === 'removed') {
        continue;
      }

      files.push({
        filename: file.filename,
        status: file.status,
        patch: file.patch,
      });
    }

    if (response.data.length < 100) {
      break;
    }

    page += 1;
  }

  return files;
}

function addedLinesFromPatch(patch: string): string {
  return patch
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .join('\n');
}

export function extractScannableContent(file: ChangedFile): { content: string; lineOffset: number } {
  if (file.content) {
    return { content: file.content, lineOffset: 0 };
  }

  if (file.patch) {
    return { content: addedLinesFromPatch(file.patch), lineOffset: 0 };
  }

  return { content: '', lineOffset: 0 };
}

export function adjustIssueLines(issues: ScanIssue[], lineOffset: number): ScanIssue[] {
  if (lineOffset === 0) {
    return issues;
  }

  return issues.map((issue) => ({
    ...issue,
    line: issue.line + lineOffset,
  }));
}

export function formatPullRequestComment(
  issuesByFile: Map<string, ScanIssue[]>,
  pullNumber: number,
): string {
  const totalIssues = [...issuesByFile.values()].reduce((sum, issues) => sum + issues.length, 0);

  const rows = [...issuesByFile.entries()]
    .flatMap(([filename, issues]) =>
      issues.map(
        (issue) =>
          `| \`${filename}\` | ${issue.line} | **${issue.type}** | \`${issue.preview}\` |`,
      ),
    )
    .join('\n');

  return [
    COMMENT_MARKER,
    '## 🛡️ Nexus Shield Security Gatekeeper',
    '',
    `Potential **PII** or **secret leak** detected in PR #${pullNumber}.`,
    '',
    `**Total findings:** ${totalIssues}`,
    '',
    '| File | Line | Issue Type | Masked Preview |',
    '| :--- | ---: | :--- | :--- |',
    rows,
    '',
    '### Recommended actions',
    '',
    '- Remove the exposed value from source control immediately.',
    '- Rotate any compromised credentials.',
    '- Move secrets to GitHub Actions secrets, environment variables, or a vault.',
    '- Use `.env.example` with placeholders instead of real values.',
    '',
    '_Automated scan by [Nexus Shield Security Gatekeeper](https://github.com/marketplace/actions/nexus-shield-security-gatekeeper)._',
  ].join('\n');
}

export async function upsertPullRequestComment(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
): Promise<void> {
  const octokit = github.getOctokit(token);
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });

  const existing = comments.data.find((comment) => comment.body?.includes(COMMENT_MARKER));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    return;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
}

export async function deletePullRequestComment(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<void> {
  const octokit = github.getOctokit(token);
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });

  const existing = comments.data.find((comment) => comment.body?.includes(COMMENT_MARKER));
  if (!existing) {
    return;
  }

  await octokit.rest.issues.deleteComment({
    owner,
    repo,
    comment_id: existing.id,
  });
}

export function getPullRequestContext(): {
  owner: string;
  repo: string;
  pullNumber: number;
} {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest?.number) {
    throw new Error('This action must run in a pull_request workflow context.');
  }

  return {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pullNumber: pullRequest.number,
  };
}

export function logIssueSummary(issuesByFile: Map<string, ScanIssue[]>): void {
  for (const [filename, issues] of issuesByFile.entries()) {
    for (const issue of issues) {
      console.log(
        `::error file=${filename},line=${issue.line},col=${issue.column}::` +
          `[${issue.type}] ${issue.preview}`,
      );
    }
  }
}

export function buildLeakSummary(issuesByFile: Map<string, ScanIssue[]>): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const issues of issuesByFile.values()) {
    for (const issue of issues) {
      summary[issue.type] = (summary[issue.type] ?? 0) + 1;
    }
  }

  return summary;
}

async function readWorkspaceFile(filename: string): Promise<string | undefined> {
  const workspace = process.env.GITHUB_WORKSPACE;
  if (!workspace) {
    return undefined;
  }

  const absolutePath = path.join(workspace, filename);
  try {
    return await fs.readFile(absolutePath, 'utf8');
  } catch {
    return undefined;
  }
}

async function scanChangedFile(filename: string, patch?: string): Promise<ScanIssue[]> {
  const workspaceContent = await readWorkspaceFile(filename);
  const content =
    workspaceContent ??
    (patch ? extractScannableContent({ filename, status: 'modified', patch }).content : '');

  if (!content) {
    return [];
  }

  const issues = scanContent(content, filename);

  if (workspaceContent && patch) {
    const patchContent = extractScannableContent({ filename, status: 'modified', patch }).content;
    const patchIssues = scanContent(patchContent, filename);
    const merged = new Map<string, ScanIssue>();

    for (const issue of [...issues, ...patchIssues]) {
      merged.set(`${issue.type}:${issue.line}:${issue.column}:${issue.preview}`, issue);
    }

    return [...merged.values()].sort((a, b) => a.line - b.line || a.column - b.column);
  }

  return adjustIssueLines(issues, 0);
}

export async function processPRDiffAndComment(githubToken: string): Promise<ScanResult> {
  const { owner, repo, pullNumber } = getPullRequestContext();
  core.info(`Scanning PR #${pullNumber} in ${owner}/${repo}`);

  const changedFiles = await getPullRequestChangedFiles(githubToken, owner, repo, pullNumber);
  core.info(`Found ${changedFiles.length} changed file(s) to inspect.`);

  const issuesByFile = new Map<string, ScanIssue[]>();

  for (const file of changedFiles) {
    const issues = await scanChangedFile(file.filename, file.patch);
    if (issues.length > 0) {
      issuesByFile.set(file.filename, issues);
    }
  }

  const totalLeaks = [...issuesByFile.values()].reduce((sum, issues) => sum + issues.length, 0);
  const leakSummary = buildLeakSummary(issuesByFile);

  if (totalLeaks === 0) {
    await deletePullRequestComment(githubToken, owner, repo, pullNumber);
    return { totalLeaks, leakSummary, issuesByFile };
  }

  core.warning(`Detected ${totalLeaks} potential leak(s).`);
  logIssueSummary(issuesByFile);

  const commentBody = formatPullRequestComment(issuesByFile, pullNumber);
  await upsertPullRequestComment(githubToken, owner, repo, pullNumber, commentBody);
  core.info('Posted Nexus Shield security report to the pull request.');

  return { totalLeaks, leakSummary, issuesByFile };
}
