import * as core from '@actions/core';
import * as github from '@actions/github';
import { processPRDiffAndComment } from './github';
import { reportMetrics } from './telemetry';

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const nexusApiKey = core.getInput('nexus-api-key', { required: false });
    const failOnDetection = core.getInput('fail-on-detection') === 'true';

    const repository = `${github.context.repo.owner}/${github.context.repo.repo}`;
    const scanResult = await processPRDiffAndComment(githubToken);

    if (scanResult.totalLeaks > 0) {
      core.error(`❌ Nexus Shield detected ${scanResult.totalLeaks} leak(s) in this Pull Request.`);

      if (nexusApiKey) {
        await reportMetrics(
          nexusApiKey,
          repository,
          scanResult.leakSummary,
          scanResult.totalLeaks,
        );
      }

      if (failOnDetection) {
        core.setFailed(
          `Nexus Shield blocked this PR: ${scanResult.totalLeaks} potential PII/secret leak(s) detected.`,
        );
      }
    } else {
      core.info('✅ No PII or secret leaks detected by Nexus Shield.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Nexus Shield Action failed: ${message}`);
  }
}

run();
