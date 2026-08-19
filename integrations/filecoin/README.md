# Filecoin evidence integration

Canonical home for the POM-RX/Proof Receipt Filecoin CAR evidence bundle and Synapse storage adapter boundary.

`evidence-bundle.mjs` is the canonical implementation. It was migrated byte-for-byte from the historical `sdk/typescript/filecoin-evidence-bundle.mjs` implementation; the historical SDK path remains as a compatibility re-export so existing consumers do not break.

`swisstokint-proof.mjs` is a narrow dependency bridge back to the shared Proof Receipt implementation. It contains no duplicated proof logic.

Filecoin storage is supporting evidence infrastructure. It does not replace POM-RX preflight, exact authorization, Witness, single-use Gate, observation or reconciliation semantics.
