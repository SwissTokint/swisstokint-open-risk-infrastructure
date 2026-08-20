# POM-RX reference plain-data boundary

This directory owns a small shared **reference-only JavaScript object-boundary primitive** for capturing inert bounded data before security-sensitive code reasons about it.

`captureReferencePlainData()` recursively copies supported scalar, plain-object and dense-array values into frozen snapshots. It rejects Node Proxy wrappers before reflective traversal, rejects getters/setters, symbol keys, custom prototypes, hidden object fields, decorated or sparse arrays, unsafe keys, unsupported values and bounded-resource violations.

This helper is intentionally **not** canonicalization, hashing, authorization, trusted time, policy evaluation, Witness, Gate execution or external evidence. It creates no security claim about data provenance or truth; it only prevents later semantic reads from consulting caller-controlled dynamic JavaScript behavior after the snapshot boundary.

The current lot does not silently retrofit existing POM-RX paths. Adoption by an existing Core or application module requires its own reviewed change because each caller still owns semantic validation, tighter field-specific limits and compatibility commitments. In particular, the frozen compatibility SDK and currently open governance-blocked PRs are not rewritten by this helper.

Reference limits are deliberately small and deterministic: depth 8, 1,000 total nodes, strings up to 16,384 JavaScript code units, object keys up to 128 ASCII-safe characters and arrays up to 1,000 dense elements. These bounds are implementation/reference limits, not a new POM-RX wire protocol.
