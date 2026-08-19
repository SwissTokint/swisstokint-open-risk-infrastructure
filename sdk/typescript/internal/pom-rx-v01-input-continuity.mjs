import {
  makePomRxV01Diagnostic,
  orderPomRxV01Diagnostics,
  throwPomRxV01Strict,
} from './pom-rx-v01-diagnostics.mjs';

export const POM_RX_V01_INPUT_CONTINUITY_INVARIANT = 'POMRX_V01_I_INPUT_CONTINUITY';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PHASES = ['preflight', 'execution', 'reconciliation'];
const DEFECT_BY_TRANSITION = new Map([
  ['preflight>execution', 'POMRX-001-INPUT-PREFLIGHT-EXECUTION'],
  ['execution>reconciliation', 'POMRX-001-INPUT-EXECUTION-RECONCILIATION'],
]);

function fail(message, details = {}) {
  throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', message, details);
}

function validateInput(receipts) {
  if (!Array.isArray(receipts) || receipts.length < 1 || receipts.length > 3) {
    fail('Input-continuity checker requires between one and three receipts');
  }

  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index];
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
      fail('Input-continuity checker received a non-object receipt', { receiptIndex: index });
    }
    if (!PHASES.includes(receipt.phase)) {
      fail('Input-continuity checker received an unsupported phase', {
        receiptIndex: index,
        phase: receipt.phase,
      });
    }
    if (!HASH_PATTERN.test(receipt.input_commitment)) {
      fail('Input-continuity checker requires a canonical input_commitment', {
        receiptIndex: index,
      });
    }
  }

  if (receipts[0].phase !== 'preflight') {
    fail('Input-continuity checker requires preflight as the first phase');
  }

  for (let index = 1; index < receipts.length; index += 1) {
    const previousPhaseIndex = PHASES.indexOf(receipts[index - 1].phase);
    const currentPhaseIndex = PHASES.indexOf(receipts[index].phase);
    if (currentPhaseIndex !== previousPhaseIndex + 1) {
      fail('Input-continuity checker requires contiguous ordered phases', {
        receiptIndex: index,
        previousPhase: receipts[index - 1].phase,
        currentPhase: receipts[index].phase,
      });
    }
  }
}

export function checkPomRxV01InputContinuity(receipts) {
  validateInput(receipts);
  const diagnostics = [];

  for (let index = 1; index < receipts.length; index += 1) {
    const previous = receipts[index - 1];
    const current = receipts[index];
    if (current.input_commitment === previous.input_commitment) continue;

    const transition = `${previous.phase}>${current.phase}`;
    const defectId = DEFECT_BY_TRANSITION.get(transition);
    if (!defectId) {
      fail('Input-continuity checker reached an unregistered phase transition', {
        receiptIndex: index,
        transition,
      });
    }

    diagnostics.push(makePomRxV01Diagnostic({
      defectId,
      diagnosticCode: 'POMRX_V01_E_INPUT_CONTINUITY',
      phase: current.phase,
      receiptIndex: index,
      field: 'input_commitment',
      message: `input_commitment changed across ${transition}`,
    }));
  }

  return orderPomRxV01Diagnostics(diagnostics);
}
