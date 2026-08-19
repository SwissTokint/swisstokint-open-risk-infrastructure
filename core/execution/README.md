# POM-RX Core — reference execution evidence

This directory owns shared POM-RX execution-evidence primitives. Application
profiles may supply domain-specific effect data, but they must not fork the
common authorization, canonicalization, hashing or evidence lifecycle.

## Current reference recorder

`reference-execution-evidence.mjs` adds a bounded, process-local recorder for a
trusted execution adapter to mark the start of an execution under one complete
exact-authorization binding and later record a bounded outcome.

The recorder:

- snapshots and validates the complete exact-authorization binding;
- recomputes the authorization commitment rather than accepting a caller hash;
- samples a synchronous monotonic trusted clock and requires the recorded
  execution start to fall inside the authorization validity window;
- returns an opaque recorder-instance-local handle and terminally consumes it
  once, including concurrent completion attempts;
- snapshots outcome data without invoking accessors and bounds depth, node
  count, strings and keys;
- accepts `success | error | unknown` outcomes;
- domain-separates effect commitments and execution-evidence hashes;
- converts malformed/ambiguous outcomes to explicit `unknown` evidence instead
  of manufacturing a known effect;
- marks evidence as reference-only and explicitly states that Gate consumption,
  external execution and external effect truth are not proved.

The local evidence brand is scoped to one recorder instance. A structural clone
or evidence produced by another recorder is not considered locally recorded.

## Deliberate limitation

This recorder **does not authorize or perform an execution**. Possession of a
structurally valid exact-authorization binding is not permission to call a
downstream system. The recorder must later be composed with the common
single-use Gate so that evidence is emitted from the actual guarded forwarding
path.

Likewise, the effect object supplied on completion is trusted adapter-reported
reference data. Hashing it proves only the bytes committed by this recorder; it
does not prove the external world, transaction finality, RPC honesty, browser
integrity or independent observation.

The intended shared lifecycle remains:

```text
exact authorization
  -> single-use Gate
  -> reference execution evidence
  -> independent observation
  -> reconciliation
```

No private keys, real wallet, network transaction, custody path or meaningful
funds belong in this reference layer.
