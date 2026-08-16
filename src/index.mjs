import * as core from '@actions/core';
import * as github from '@actions/github';

import {
  buildReviewPrompt,
  callZaiApi,
  createCommentBody,
  filterFiles,
  findExistingReviewComment,
  getChangedFiles,
  getIssueComments,
  parseIntegerInput,
  parseReasoningEffort,
  supportsReasoningEffort,
} from './review.mjs';

async function run() {
  const apiKey = core.getInput('ZAI_API_KEY', { required: true });
  const token = core.getInput('GITHUB_TOKEN', { required: true });
  core.setSecret(apiKey);
  core.setSecret(token);

  const model = core.getInput('ZAI_MODEL', { required: true });
  const systemPrompt = core.getInput('ZAI_SYSTEM_PROMPT', { required: true });
  const reviewerName = core.getInput('ZAI_REVIEWER_NAME', { required: true });
  const excludePatterns = core.getInput('EXCLUDE_PATTERNS')
    .split(',')
    .map(pattern => pattern.trim())
    .filter(Boolean);
  const maxDiffChars = parseIntegerInput(core.getInput('MAX_DIFF_CHARS'), 'MAX_DIFF_CHARS', {
    allowZero: true,
    max: 1_000_000,
  });
  const maxOutputTokens = parseIntegerInput(core.getInput('MAX_OUTPUT_TOKENS'), 'MAX_OUTPUT_TOKENS', {
    max: 128_000,
  });
  const reasoningEffort = parseReasoningEffort(core.getInput('ZAI_REASONING_EFFORT'));

  if (reasoningEffort && !supportsReasoningEffort(model)) {
    core.warning('ZAI_REASONING_EFFORT applies only to GLM-5.2 and newer. The action will not send it for this model.');
  }

  const { context } = github;
  const { owner, repo } = context.repo;
  const pullNumber = context.payload.pull_request?.number;
  if (!pullNumber) {
    core.setFailed('This action only runs on pull_request events.');
    return;
  }

  const octokit = github.getOctokit(token);
  core.info(`Fetching changed files for PR #${pullNumber}.`);
  const files = await getChangedFiles(octokit, owner, repo, pullNumber);
  const filteredFiles = filterFiles(files, excludePatterns);
  const excludedCount = files.length - filteredFiles.length;
  if (excludedCount) {
    core.info(`Excluded ${excludedCount} file(s) matching EXCLUDE_PATTERNS.`);
  }

  const prompt = buildReviewPrompt(filteredFiles, maxDiffChars);
  if (!prompt.reviewedFileCount) {
    core.info('No patchable changes found after filtering. Skipping review.');
    return;
  }
  if (prompt.truncatedFiles.length || prompt.skippedFiles.length || prompt.filesWithoutPatch.length) {
    core.warning(`The action sent ${prompt.reviewedFileCount} patch(es) and ${prompt.totalDiffChars} diff character(s) to Z.ai. Check the review comment for omitted files.`);
  }

  core.info(`Sending ${prompt.reviewedFileCount} file(s) to Z.ai using ${model}.`);
  const review = await callZaiApi({
    apiKey,
    model,
    systemPrompt,
    prompt: prompt.prompt,
    maxOutputTokens,
    reasoningEffort,
    timeoutMs: 300_000,
    onRetry: message => core.warning(message),
  });
  const body = createCommentBody(reviewerName, review, prompt);

  const comments = await getIssueComments(octokit, owner, repo, pullNumber);
  const existing = findExistingReviewComment(comments);
  let comment;
  if (existing) {
    ({ data: comment } = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    }));
    core.info('Review comment updated.');
  } else {
    ({ data: comment } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    }));
    core.info('Review comment posted.');
  }

  core.setOutput('comment-id', comment.id);
  core.setOutput('reviewed-file-count', prompt.reviewedFileCount);
  core.setOutput('omitted-file-count', prompt.truncatedFiles.length + prompt.skippedFiles.length + prompt.filesWithoutPatch.length);
}

run().catch(error => core.setFailed(error.message));
