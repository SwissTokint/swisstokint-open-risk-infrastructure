import {
  makePomRxV01Diagnostic,
  orderPomRxV01Diagnostics,
  throwPomRxV01Strict,
} from './pom-rx-v01-diagnostics.mjs';

export const POM_RX_V01_RECEIPT_ID_UNIQUENESS_INVARIANT =
  'POMRX_V01_I_RECEIPT_ID_UNIQUENESS';

const PHASES = ['preflight', 'execution', 'reconciliation'];
const RECEIPT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u;

function fail(message, details = {}) {
  throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', message, details);
}

function validateInput(receipts) {
  if (!Array.isArray(receipts) || receipts.length < 1 || receipts.length > 3) {
    fail('Receipt-ID uniqueness checker requires between one and three receipts');
  }

  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index];
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
      fail('Receipt-ID uniqueness checker received a non-object receipt', {
        receiptIndex: index,
      });
    }
    if (!PHASES.includes(receipt.phase)) {
      fail('Receipt-ID uniqueness checker received an unsupported phase', {
        receiptIndex: index,
        phase: receipt.phase,
      });
    }
    if (typeof receipt.receipt_id !== 'string'
      || !RECEIPT_ID_PATTERN.test(receipt.receipt_id)) {
      fail('Receipt-ID uniqueness checker requires a canonical receipt_id', {
        receiptIndex: index,
      });
    }
  }

  if (receipts[0].phase !== 'preflight') {
    fail('Receipt-ID uniqueness checker requires preflight as the first phase');
  }

  for (let index = 1; index < receipts.length; index += 1) {
    const previousPhaseIndex = PHASES.indexOf(receipts[index - 1].phase);
    const currentPhaseIndex = PHASES.indexOf(receipts[index].phase);
    if (currentPhaseIndex !== previousPhaseIndex + 1) {
      fail('Receipt-ID uniqueness checker requires contiguous ordered phases', {
        receiptIndex: index,
        previousPhase: receipts[index - 1].phase,
        currentPhase: receipts[index].phase,
      });
    }
  }
}

export function checkPomRxV01ReceiptIdUniqueness(receipts) {
  validateInput(receipts);
  const firstIndexByReceiptId = new Map();
  const diagnostics = [];

  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index];
    const firstIndex = firstIndexByReceiptId.get(receipt.receipt_id);
    if (firstIndex === undefined) {
      firstIndexByReceiptId.set(receipt.receipt_id, index);
      continue;
    }

    diagnostics.push(makePomRxV01Diagnostic({
      defectId: 'POMRX-007-DUPLICATE-RECEIPT-ID',
      diagnosticCode: 'POMRX_V01_E_DUPLICATE_RECEIPT_ID',
      phase: receipt.phase,
      receiptIndex: index,
      field: 'receipt_id',
      message: `receipt_id duplicates receipt index ${firstIndex}`,
    }));
  }

  return orderPomRxV01Diagnostics(diagnostics);
}
