import {
  makePomRxV01Diagnostic,
  orderPomRxV01Diagnostics,
  throwPomRxV01Strict,
} from './pom-rx-v01-diagnostics.mjs';

export const POM_RX_V01_EXECUTION_ASSERTION_CONSISTENCY_INVARIANT =
  'POMRX_V01_I_EXECUTION_ASSERTION_CONSISTENCY';

const PHASES = ['preflight', 'execution', 'reconciliation'];
const OUTCOMES_BY_PHASE = new Map([
  ['preflight', new Set(['allow', 'deny'])],
  ['execution', new Set(['accepted', 'rejected', 'unresolved'])],
  ['reconciliation', new Set(['matched', 'mismatched', 'unresolved'])],
]);
const ASSERTION_RESULTS = new Set(['pass', 'fail', 'not_evaluated']);

function fail(message, details = {}) {
  throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', message, details);
}

function validateInput(receipts) {
  if (!Array.isArray(receipts) || receipts.length < 1 || receipts.length > 3) {
    fail('Execution assertion-consistency checker requires between one and three receipts');
  }

  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index];
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
      fail('Execution assertion-consistency checker received a non-object receipt', {
        receiptIndex: index,
      });
    }
    if (!PHASES.includes(receipt.phase)) {
      fail('Execution assertion-consistency checker received an unsupported phase', {
        receiptIndex: index,
        phase: receipt.phase,
      });
    }
    if (!OUTCOMES_BY_PHASE.get(receipt.phase).has(receipt.outcome)) {
      fail('Execution assertion-consistency checker received an invalid phase outcome', {
        receiptIndex: index,
        phase: receipt.phase,
        outcome: receipt.outcome,
      });
    }
    if (!Array.isArray(receipt.assertions)
      || receipt.assertions.length < 1
      || receipt.assertions.length > 64) {
      fail('Execution assertion-consistency checker requires between one and 64 assertions', {
        receiptIndex: index,
      });
    }
    for (let assertionIndex = 0; assertionIndex < receipt.assertions.length; assertionIndex += 1) {
      const assertion = receipt.assertions[assertionIndex];
      if (!assertion || typeof assertion !== 'object' || Array.isArray(assertion)
        || !ASSERTION_RESULTS.has(assertion.result)) {
        fail('Execution assertion-consistency checker received an invalid assertion result', {
          receiptIndex: index,
          assertionIndex,
        });
      }
    }
  }

  if (receipts[0].phase !== 'preflight') {
    fail('Execution assertion-consistency checker requires preflight as the first phase');
  }

  for (let index = 1; index < receipts.length; index += 1) {
    const previousPhaseIndex = PHASES.indexOf(receipts[index - 1].phase);
    const currentPhaseIndex = PHASES.indexOf(receipts[index].phase);
    if (currentPhaseIndex !== previousPhaseIndex + 1) {
      fail('Execution assertion-consistency checker requires contiguous ordered phases', {
        receiptIndex: index,
        previousPhase: receipts[index - 1].phase,
        currentPhase: receipts[index].phase,
      });
    }
  }
}

export function checkPomRxV01ExecutionAssertionConsistency(receipts) {
  validateInput(receipts);
  const executionIndex = receipts.findIndex(({ phase }) => phase === 'execution');
  if (executionIndex === -1) return Object.freeze([]);

  const execution = receipts[executionIndex];
  if (execution.outcome !== 'accepted') return Object.freeze([]);

  const nonPassing = execution.assertions.filter(({ result }) => result !== 'pass');
  if (nonPassing.length === 0) return Object.freeze([]);

  const hasTrackedFailure = nonPassing.some(({ result }) => result === 'fail');
  return orderPomRxV01Diagnostics([
    makePomRxV01Diagnostic({
      defectId: hasTrackedFailure ? 'POMRX-006-EXECUTION-FAIL-ASSERTION' : null,
      diagnosticCode: 'POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT',
      phase: 'execution',
      receiptIndex: executionIndex,
      field: 'assertions',
      message: 'execution:accepted requires every assertion to pass',
    }),
  ]);
}
