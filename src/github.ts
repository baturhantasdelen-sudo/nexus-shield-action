import * as github from '@actions/github';
import { ScanIssue } from './scanner';

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
