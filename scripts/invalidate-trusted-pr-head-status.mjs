import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  TRUSTED_PR_STATUS_CONTEXT,
  validateTrustedPrStatusResponse,
} from './publish-trusted-pr-status.mjs';

function requiredString(environment, name) {
  const value = environment[name];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`missing ${name}`);
  return value;
}

export function buildInvalidationRequest(environment) {
  const repository = requiredString(environment, 'GITHUB_REPOSITORY');
  const headSha = requiredString(environment, 'INVALIDATED_HEAD_SHA');
  const runId = requiredString(environment, 'GITHUB_RUN_ID');
  const serverUrl = requiredString(environment, 'GITHUB_SERVER_URL');
  const apiUrl = requiredString(environment, 'GITHUB_API_URL');
  requiredString(environment, 'GH_TOKEN');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) {
    throw new Error('invalid GITHUB_REPOSITORY');
  }
  if (!/^[0-9a-f]{40}$/u.test(headSha)) throw new Error('invalid INVALIDATED_HEAD_SHA');
  if (!/^[1-9][0-9]*$/u.test(runId)) throw new Error('invalid GITHUB_RUN_ID');
  if (serverUrl !== 'https://github.com' || apiUrl !== 'https://api.github.com') {
    throw new Error('unexpected GitHub endpoint');
  }
  return Object.freeze({
    apiPath: `repos/${repository}/statuses/${headSha}`,
    expectedStatusUrlPrefix: `${apiUrl}/repos/${repository}/statuses/`,
    payload: Object.freeze({
      state: 'pending',
      target_url: `${serverUrl}/${repository}/actions/runs/${runId}`,
      description: 'Trusted exact-head evidence was invalidated when the PR head departed.',
      context: TRUSTED_PR_STATUS_CONTEXT,
    }),
  });
}

export function invalidateTrustedPrHead(environment = process.env, spawn = spawnSync) {
  const request = buildInvalidationRequest(environment);
  const result = spawn(
    '/usr/bin/gh',
    ['api', '--method', 'POST', request.apiPath, '--input', '-'],
    {
      encoding: 'utf8',
      input: JSON.stringify(request.payload),
      timeout: 20_000,
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  if (result.signal !== null || result.status !== 0) {
    throw new Error('departing trusted PR head invalidation failed');
  }
  return validateTrustedPrStatusResponse(result.stdout, request);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) invalidateTrustedPrHead();
