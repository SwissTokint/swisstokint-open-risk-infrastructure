import {
  verifyPomRxSourceEnvelope,
  verifyPomRxWitnessAck,
} from '../../sdk/typescript/pom-rx-witness.mjs';
import {
  captureReferencePlainData,
} from '../reference-data/plain-data-snapshot.mjs';

export const POM_RX_REFERENCE_WITNESS_EVIDENCE_BINDING_VERSION =
  'pom-rx-witness-evidence-binding/0.1';

function failure(code, message) {
  return Object.freeze({ ok: false, code, error: message });
}

/**
 * Bind a higher-level Witness authorization result back to the exact source
 * envelope and acknowledgement that were supplied for verification.
 *
 * The trust lifecycle decides whether the identities are enrolled, active and
 * authorized at trusted time. This helper has a narrower job: independently
 * re-verify the exact signed evidence with the shared SDK primitives and prove
 * that the lifecycle result identifies that same receipt and acknowledgement.
 * This prevents a memoized/stale success result from being combined with a
 * different acknowledgement that happens to reuse the same receipt and keys.
 */
export function verifyReferenceWitnessEvidenceResultBinding(
  sourceEnvelope,
  witnessAcknowledgement,
  verificationResult,
) {
  const sourceSnapshot = captureReferencePlainData(
    sourceEnvelope,
    'POM-RX Witness binding source envelope',
  );
  const acknowledgementSnapshot = captureReferencePlainData(
    witnessAcknowledgement,
    'POM-RX Witness binding acknowledgement',
  );
  const resultSnapshot = captureReferencePlainData(
    verificationResult,
    'POM-RX Witness binding verification result',
  );

  const sourceVerified = verifyPomRxSourceEnvelope(sourceSnapshot);
  if (!sourceVerified.ok) {
    return failure(
      'POMRX_WITNESS_BINDING_E_SOURCE',
      'source envelope does not verify against the exact supplied evidence',
    );
  }

  const acknowledgementVerified = verifyPomRxWitnessAck(
    acknowledgementSnapshot,
    {
      receiptHash: sourceVerified.receiptHash,
      receiptId: sourceVerified.receipt.receipt_id,
      runId: sourceVerified.receipt.run_id,
      outcome: sourceVerified.receipt.outcome,
      sourceKeyId: sourceVerified.sourceKeyId,
      mode: 'witnessed',
    },
  );
  if (!acknowledgementVerified.ok) {
    return failure(
      'POMRX_WITNESS_BINDING_E_ACK',
      'Witness acknowledgement does not verify against the exact supplied source evidence',
    );
  }

  if (resultSnapshot.receipt_hash !== sourceVerified.receiptHash
      || resultSnapshot.source_key_id !== sourceVerified.sourceKeyId
      || resultSnapshot.acknowledgement_hash
        !== acknowledgementVerified.acknowledgementHash
      || resultSnapshot.witness_key_id
        !== acknowledgementVerified.payload.witness_key_id) {
    return failure(
      'POMRX_WITNESS_BINDING_E_RESULT',
      'Witness verification result does not identify the exact supplied signed evidence',
    );
  }

  return Object.freeze({
    ok: true,
    schema_version: POM_RX_REFERENCE_WITNESS_EVIDENCE_BINDING_VERSION,
    receipt_hash: sourceVerified.receiptHash,
    acknowledgement_hash: acknowledgementVerified.acknowledgementHash,
    source_key_id: sourceVerified.sourceKeyId,
    witness_key_id: acknowledgementVerified.payload.witness_key_id,
    acknowledgement_received_at: acknowledgementVerified.payload.received_at,
    acknowledgement_valid_until: acknowledgementVerified.payload.valid_until,
  });
}
