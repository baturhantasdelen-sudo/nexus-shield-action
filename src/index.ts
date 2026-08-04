import * as core from '@actions/core';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  adjustIssueLines,
  deletePullRequestComment,
  extractScannableContent,
  formatPullRequestComment,
  getPullRequestChangedFiles,
  getPullRequestContext,
  logIssueSummary,
  upsertPullRequestComment,
} from './github';
import { scanContent, ScanIssue } from './scanner';

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

async function scanChangedFile(
  filename: string,
  patch?: string,
): Promise<ScanIssue[]> {
  const workspaceContent = await readWorkspaceFile(filename);
  const content = workspaceContent ?? (patch ? extractScannableContent({ filename, status: 'modified', patch }).content : '');

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

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const failOnDetection = core.getBooleanInput('fail-on-detection');

    const { owner, repo, pullNumber } = getPullRequestContext();
    core.info(`Scanning PR #${pullNumber} in ${owner}/${repo}`);

    const changedFiles = await getPullRequestChangedFiles(token, owner, repo, pullNumber);
    core.info(`Found ${changedFiles.length} changed file(s) to inspect.`);

    const issuesByFile = new Map<string, ScanIssue[]>();

    for (const file of changedFiles) {
      const issues = await scanChangedFile(file.filename, file.patch);
      if (issues.length > 0) {
        issuesByFile.set(file.filename, issues);
      }
    }

    const totalIssues = [...issuesByFile.values()].reduce((sum, issues) => sum + issues.length, 0);

    if (totalIssues === 0) {
      core.info('No PII or secret leaks detected.');
      await deletePullRequestComment(token, owner, repo, pullNumber);
      return;
    }

    core.warning(`Detected ${totalIssues} potential leak(s).`);
    logIssueSummary(issuesByFile);

    const commentBody = formatPullRequestComment(issuesByFile, pullNumber);
    await upsertPullRequestComment(token, owner, repo, pullNumber, commentBody);
    core.info('Posted Nexus Shield security report to the pull request.');

    if (failOnDetection) {
      core.setFailed(
        `Nexus Shield blocked this PR: ${totalIssues} potential PII/secret leak(s) detected.`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Nexus Shield action failed: ${message}`);
  }
}

run();
