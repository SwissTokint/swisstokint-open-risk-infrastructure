import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  POM_RX_SCHEMA_VERSION,
  commitPomRxReceipt,
} from '../../sdk/typescript/pom-rx.mjs';
import {
  PomRxV01StrictError,
  makePomRxV01Diagnostic,
  throwPomRxV01Strict,
} from '../../sdk/typescript/internal/pom-rx-v01-diagnostics.mjs';
import {
  verifyPomRxArtifactIdentity,
} from '../../sdk/typescript/internal/pom-rx-v01-artifact-identity.mjs';
import {
  bindFreshPomRxPolicyCapability,
  consumeFreshPomRxPolicyBinding,
  inspectFreshPomRxPolicyCapabilityHostPins,
} from '../../sdk/typescript/internal/pom-rx-v01-policy-capability.mjs';
import {
  buildPomRxV01StrictVerdict,
} from '../../sdk/typescript/internal/pom-rx-v01-verdict.mjs';
import {
  checkPomRxV01ActionContinuity,
} from '../../sdk/typescript/internal/pom-rx-v01-action-continuity.mjs';
import {
  checkPomRxV01InputContinuity,
} from '../../sdk/typescript/internal/pom-rx-v01-input-continuity.mjs';
import {
  checkPomRxV01ExecutionAssertionConsistency,
} from '../../sdk/typescript/internal/pom-rx-v01-execution-assertion-consistency.mjs';
import {
  checkPomRxV01ReconciliationAssertionConsistency,
} from '../../sdk/typescript/internal/pom-rx-v01-reconciliation-assertion-consistency.mjs';
import {
  checkPomRxV01ReceiptIdUniqueness,
} from '../../sdk/typescript/internal/pom-rx-v01-receipt-id-uniqueness.mjs';

export const POM_RX_V01_STRICT_PROFILE = 'pom-rx-v0.1/strict-errata-1';
export const POM_RX_V01_STRICT_VERIFIER_VERSION = 'pom-rx-v0.1-strict-verifier/1';

const PHASES = ['preflight', 'execution', 'reconciliation'];
const SHARED_FIELDS = ['run_id', 'agent_ref', 'subject_ref', 'method_hash', 'policy_hash'];
const CANARY_INPUT_BYTES = Buffer.from('["a-a","a.a","a_a"]', 'utf8');
const CANARY_EXPECTED_BYTES = Buffer.from('["a_a","a-a","a.a"]', 'utf8');
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/gu;

function packageRoot() {
  const modulePath = decodeURIComponent(new URL(import.meta.url).pathname);
  return path.resolve(path.dirname(modulePath), '../..');
}

function measureRuntime() {
  return Object.freeze({
    node_version: process.versions.node,
    icu_version: process.versions.icu,
    unicode_version: process.versions.unicode,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    platform: process.platform,
    arch: process.arch,
  });
}

function safeMessage(value, fallback) {
  const raw = typeof value === 'string' ? value : fallback;
  const sanitized = raw.replace(CONTROL_CHARACTERS, ' ').trim().slice(0, 2048);
  return sanitized || fallback;
}

function diagnostic(code, message, details = {}) {
  return makePomRxV01Diagnostic({
    diagnosticCode: code,
    phase: details.phase ?? null,
    receiptIndex: details.receiptIndex ?? null,
    field: details.field ?? null,
    message: safeMessage(message, 'POM-RX strict verification failed'),
  });
}

function diagnosticFromError(error) {
  const code = error instanceof PomRxV01StrictError
    && error.code !== 'POMRX_V01_E_PROFILE_INCOMPLETE'
    ? error.code
    : 'POMRX_V01_E_INTERNAL_VERIFIER_ERROR';
  return diagnostic(
    code,
    error instanceof Error ? error.message : 'Unknown POM-RX strict verification error',
  );
}

function indeterminate(diagnostics, binding = null) {
  return buildPomRxV01StrictVerdict({
    verifierProfile: binding?.verifier_profile ?? null,
    verifierVersion: binding?.verifier_version ?? null,
    implementationArtifactSha256: binding?.implementation_artifact_sha256 ?? null,
    expectedImplementationArtifactSha256:
      binding?.expected_implementation_artifact_sha256 ?? null,
    observedImplementationArtifactSha256:
      binding?.observed_implementation_artifact_sha256 ?? null,
    executionEnvironment: binding?.execution_environment ?? null,
    effectivePolicyId: binding?.effective_policy_id ?? null,
    effectivePolicyVersion: binding?.effective_policy_version ?? null,
    effectivePolicySha256: binding?.effective_policy_sha256 ?? null,
    structuralStatus: 'indeterminate',
    diagnostics,
  });
}

function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return diagnostic('POMRX_V01_E_PROFILE_REQUIRED', 'verificationProfile is required');
  }
  const keys = Object.keys(options).sort();
  if (keys.some((key) => !['allowPartial', 'verificationProfile'].includes(key))) {
    return diagnostic('POMRX_V01_E_PROFILE_UNSUPPORTED', 'Strict verification options contain unknown fields');
  }
  if (!Object.hasOwn(options, 'verificationProfile')) {
    return diagnostic('POMRX_V01_E_PROFILE_REQUIRED', 'verificationProfile is required');
  }
  if (options.verificationProfile === POM_RX_SCHEMA_VERSION
    || options.verificationProfile === 'legacy') {
    return diagnostic('POMRX_V01_E_DOWNGRADE_FORBIDDEN', 'Legacy verification cannot be selected through the strict API');
  }
  if (options.verificationProfile !== POM_RX_V01_STRICT_PROFILE) {
    return diagnostic('POMRX_V01_E_PROFILE_UNSUPPORTED', 'verificationProfile is unsupported');
  }
  if (Object.hasOwn(options, 'allowPartial') && typeof options.allowPartial !== 'boolean') {
    return diagnostic('POMRX_V01_E_PROFILE_UNSUPPORTED', 'allowPartial must be boolean');
  }
  return null;
}

function runRuntimeCanary(root) {
  if (process.platform === 'win32') {
    throwPomRxV01Strict(
      'POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED',
      'Production strict artifact metadata verification is not enabled on Windows',
    );
  }
  const inputPath = path.join(
    root,
    'fixtures',
    'pom-rx',
    'v0.1-compat',
    '1',
    'canaries',
    'localecompare-order-v1.input.json',
  );
  const expectedPath = path.join(
    root,
    'fixtures',
    'pom-rx',
    'v0.1-compat',
    '1',
    'canaries',
    'localecompare-order-v1.expected.json',
  );
  let inputBytes;
  let expectedBytes;
  try {
    inputBytes = readFileSync(inputPath);
    expectedBytes = readFileSync(expectedPath);
  } catch {
    throwPomRxV01Strict(
      'POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED',
      'Frozen canonicalization canary cannot be read',
    );
  }
  if (!Buffer.from(inputBytes).equals(CANARY_INPUT_BYTES)
    || !Buffer.from(expectedBytes).equals(CANARY_EXPECTED_BYTES)) {
    throwPomRxV01Strict(
      'POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED',
      'Frozen canonicalization canary bytes differ from the strict verifier contract',
    );
  }
  let input;
  try {
    input = JSON.parse(inputBytes.toString('utf8'));
  } catch {
    throwPomRxV01Strict(
      'POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED',
      'Frozen canonicalization canary is malformed',
    );
  }
  if (!Array.isArray(input) || input.some((value) => typeof value !== 'string')) {
    throwPomRxV01Strict(
      'POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED',
      'Frozen canonicalization canary shape is invalid',
    );
  }
  const observed = Buffer.from(
    JSON.stringify([...input].sort((left, right) => left.localeCompare(right))),
    'utf8',
  );
  if (!observed.equals(CANARY_EXPECTED_BYTES)) {
    throwPomRxV01Strict(
      'POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED',
      'Runtime canonicalization canary does not reproduce the frozen v0.1 ordering',
    );
  }
}

function bindVerifier(capability) {
  const runtime = measureRuntime();
  const root = packageRoot();
  runRuntimeCanary(root);
  const hostPins = inspectFreshPomRxPolicyCapabilityHostPins(capability);
  const artifact = verifyPomRxArtifactIdentity({
    packageRoot: root,
    artifactManifestPath: hostPins.artifact_manifest_path,
    expectedArtifactManifestSha256: hostPins.expected_artifact_manifest_sha256,
    caseFoldingPath: path.join(
      root,
      'fixtures',
      'pom-rx',
      'support',
      'unicode',
      '17.0.0',
      'CaseFolding.txt',
    ),
  });
  if (artifact.verifier_version !== POM_RX_V01_STRICT_VERIFIER_VERSION) {
    throwPomRxV01Strict(
      'POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH',
      'Artifact manifest verifier version does not match the active strict verifier',
    );
  }
  const selectedTuple = Object.freeze({
    receipt_schema_version: POM_RX_SCHEMA_VERSION,
    verifier_profile: POM_RX_V01_STRICT_PROFILE,
    verifier_version: POM_RX_V01_STRICT_VERIFIER_VERSION,
    implementation_artifact_sha256: artifact.implementation_artifact_sha256,
  });
  const policy = consumeFreshPomRxPolicyBinding(
    bindFreshPomRxPolicyCapability(capability, selectedTuple, runtime),
  );
  if (policy.selected_verifier.implementation_artifact_sha256
      !== artifact.implementation_artifact_sha256) {
    throwPomRxV01Strict(
      'POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH',
      'Policy-selected artifact identity differs from the measured implementation',
    );
  }
  return Object.freeze({
    verifier_profile: POM_RX_V01_STRICT_PROFILE,
    verifier_version: POM_RX_V01_STRICT_VERIFIER_VERSION,
    implementation_artifact_sha256: artifact.implementation_artifact_sha256,
    expected_implementation_artifact_sha256:
      artifact.expected_implementation_artifact_sha256,
    observed_implementation_artifact_sha256:
      artifact.observed_implementation_artifact_sha256,
    execution_environment: policy.execution_environment,
    effective_policy_id: policy.effective_policy_id,
    effective_policy_version: policy.effective_policy_version,
    effective_policy_sha256: policy.effective_policy_sha256,
  });
}

function commitStrictReceipts(receipts) {
  if (!Array.isArray(receipts) || receipts.length < 1 || receipts.length > PHASES.length) {
    return {
      committed: null,
      diagnostics: [diagnostic(
        'POMRX_V01_E_SCHEMA_INVALID',
        'A strict POM-RX chain requires between one and three receipts',
      )],
    };
  }
  const committed = [];
  for (let index = 0; index < receipts.length; index += 1) {
    try {
      committed.push(commitPomRxReceipt(receipts[index]));
    } catch (error) {
      return {
        committed: null,
        diagnostics: [diagnostic(
          'POMRX_V01_E_SCHEMA_INVALID',
          error instanceof Error ? error.message : 'POM-RX receipt validation failed',
          { receiptIndex: index },
        )],
      };
    }
  }
  return { committed, diagnostics: [] };
}

function checkBaseChain(committed, allowPartial) {
  const diagnostics = [];
  const [first] = committed;
  if (first.receipt.phase !== 'preflight') {
    diagnostics.push(diagnostic(
      'POMRX_V01_E_CHAIN_PHASE_INVALID',
      'A POM-RX chain must start with preflight',
      { phase: first.receipt.phase, receiptIndex: 0, field: 'phase' },
    ));
    return diagnostics;
  }

  for (let index = 1; index < committed.length; index += 1) {
    const previous = committed[index - 1];
    const current = committed[index];
    if (PHASES.indexOf(current.receipt.phase) !== PHASES.indexOf(previous.receipt.phase) + 1) {
      diagnostics.push(diagnostic(
        'POMRX_V01_E_CHAIN_PHASE_INVALID',
        'POM-RX phases must be contiguous and ordered',
        { phase: current.receipt.phase, receiptIndex: index, field: 'phase' },
      ));
    }
    if (current.receipt.previous_receipt_hash !== previous.receiptHash) {
      diagnostics.push(diagnostic(
        'POMRX_V01_E_RECEIPT_HASH_LINK_INVALID',
        'POM-RX previous_receipt_hash does not match',
        { phase: current.receipt.phase, receiptIndex: index, field: 'previous_receipt_hash' },
      ));
    }
    if (current.receipt.occurred_at < previous.receipt.occurred_at) {
      diagnostics.push(diagnostic(
        'POMRX_V01_E_CHAIN_TIMESTAMP_INVALID',
        'POM-RX receipt time cannot move backwards',
        { phase: current.receipt.phase, receiptIndex: index, field: 'occurred_at' },
      ));
    }
    for (const field of SHARED_FIELDS) {
      if (current.receipt[field] !== first.receipt[field]) {
        diagnostics.push(diagnostic(
          'POMRX_V01_E_CHAIN_SHARED_FIELD_CHANGED',
          `${field} changed within the POM-RX chain`,
          { phase: current.receipt.phase, receiptIndex: index, field },
        ));
      }
    }
  }

  if (first.receipt.outcome === 'deny' && committed.length !== 1) {
    diagnostics.push(diagnostic(
      'POMRX_V01_E_CHAIN_PHASE_INVALID',
      'A denied preflight cannot be followed by execution',
      { phase: committed[1].receipt.phase, receiptIndex: 1, field: 'phase' },
    ));
  }
  if (first.receipt.outcome === 'allow' && !allowPartial && committed.length < 2) {
    diagnostics.push(diagnostic(
      'POMRX_V01_E_PARTIAL_CHAIN_FORBIDDEN',
      'An allowed preflight requires an execution receipt',
      { phase: 'preflight', receiptIndex: 0 },
    ));
  }

  const executionIndex = committed.findIndex(({ receipt }) => receipt.phase === 'execution');
  const reconciliationIndex = committed.findIndex(({ receipt }) => receipt.phase === 'reconciliation');
  const execution = executionIndex === -1 ? null : committed[executionIndex].receipt;
  if (execution?.outcome === 'accepted' && !allowPartial && reconciliationIndex === -1) {
    diagnostics.push(diagnostic(
      'POMRX_V01_E_PARTIAL_CHAIN_FORBIDDEN',
      'An accepted execution requires reconciliation',
      { phase: 'execution', receiptIndex: executionIndex },
    ));
  }
  if (execution?.outcome === 'rejected' && reconciliationIndex !== -1) {
    diagnostics.push(diagnostic(
      'POMRX_V01_E_CHAIN_PHASE_INVALID',
      'A rejected execution cannot be marked as reconciled',
      { phase: 'reconciliation', receiptIndex: reconciliationIndex, field: 'phase' },
    ));
  }
  return diagnostics;
}

function runStrictInvariants(normalizedReceipts) {
  return [
    ...checkPomRxV01ActionContinuity(normalizedReceipts),
    ...checkPomRxV01InputContinuity(normalizedReceipts),
    ...checkPomRxV01ExecutionAssertionConsistency(normalizedReceipts),
    ...checkPomRxV01ReconciliationAssertionConsistency(normalizedReceipts),
    ...checkPomRxV01ReceiptIdUniqueness(normalizedReceipts),
  ];
}

export function verifyPomRxChainProfiled(receipts, options, trustedPolicyCapability) {
  const optionDiagnostic = validateOptions(options);
  if (optionDiagnostic) return indeterminate([optionDiagnostic]);

  let binding;
  try {
    binding = bindVerifier(trustedPolicyCapability);
  } catch (error) {
    return indeterminate([diagnosticFromError(error)]);
  }

  const allowPartial = options.allowPartial ?? false;
  const committedResult = commitStrictReceipts(receipts);
  if (!committedResult.committed) {
    return indeterminate(committedResult.diagnostics, binding);
  }
  const committed = committedResult.committed;
  const baseDiagnostics = checkBaseChain(committed, allowPartial);
  const receiptHashes = committed.map(({ receiptHash }) => receiptHash);
  if (baseDiagnostics.length > 0) {
    return buildPomRxV01StrictVerdict({
      receiptSchemaVersion: POM_RX_SCHEMA_VERSION,
      receiptHashes,
      verifierProfile: binding.verifier_profile,
      verifierVersion: binding.verifier_version,
      implementationArtifactSha256: binding.implementation_artifact_sha256,
      expectedImplementationArtifactSha256:
        binding.expected_implementation_artifact_sha256,
      observedImplementationArtifactSha256:
        binding.observed_implementation_artifact_sha256,
      executionEnvironment: binding.execution_environment,
      effectivePolicyId: binding.effective_policy_id,
      effectivePolicyVersion: binding.effective_policy_version,
      effectivePolicySha256: binding.effective_policy_sha256,
      structuralStatus: 'nonconformant',
      diagnostics: baseDiagnostics,
    });
  }

  let invariantDiagnostics;
  try {
    invariantDiagnostics = runStrictInvariants(
      committed.map(({ receipt }) => receipt),
    );
  } catch (error) {
    return indeterminate([diagnosticFromError(error)], binding);
  }

  return buildPomRxV01StrictVerdict({
    receiptSchemaVersion: POM_RX_SCHEMA_VERSION,
    receiptHashes,
    verifierProfile: binding.verifier_profile,
    verifierVersion: binding.verifier_version,
    implementationArtifactSha256: binding.implementation_artifact_sha256,
    expectedImplementationArtifactSha256:
      binding.expected_implementation_artifact_sha256,
    observedImplementationArtifactSha256:
      binding.observed_implementation_artifact_sha256,
    executionEnvironment: binding.execution_environment,
    effectivePolicyId: binding.effective_policy_id,
    effectivePolicyVersion: binding.effective_policy_version,
    effectivePolicySha256: binding.effective_policy_sha256,
    structuralStatus: invariantDiagnostics.length === 0 ? 'conformant' : 'nonconformant',
    diagnostics: invariantDiagnostics,
  });
}
