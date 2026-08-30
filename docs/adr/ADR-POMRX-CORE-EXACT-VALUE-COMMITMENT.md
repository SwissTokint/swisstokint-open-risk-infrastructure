# ADR — POM-RX Core exact-value commitment primitive

Status: **PROPOSED / IMPLEMENTATION BLOCKED ON CORE-001**  
Issue: #157  
Parent program: #143

## Context

POM-RX integrations need to bind an exact normalized action to an authorization and later compare that identity with the prepared execution handed to a downstream adapter. MCP PR #156 exposed an architectural problem: its application-local normalizer had to invent a second exact-value transcript and hashing implementation to distinguish execution-relevant values such as `-0`, decomposed Unicode strings and ordered arrays.

Application profiles should own **domain normalization**. They should not each own the cryptographic byte contract used by POM-RX exact authorization.

The existing Proof Receipt canonicalization has a different goal: portable evidence representation. It must not be silently repurposed as execution identity if its normalization semantics collapse distinctions that an execution adapter can observe.

## Decision

Core will own one versioned, domain-separated **exact-value commitment** primitive. The primitive knows nothing about MCP, wallets, payments, tools, policies or transports.

Conceptual API:

```text
prepareReferenceExactValueCommitment({
  domain,
  value
})
  -> {
       captured_value,
       transcript_version,
       commitment_sha256
     }
```

Final symbol names remain subject to exact-head implementation review.

The public boundary must first cross the accepted shared Core inert-data capture boundary. CORE-004 must therefore reuse the hardened `core/reference-data` primitive accepted through CORE-001 rather than fork another hostile-object capture implementation.

## Separation of responsibilities

```text
application parser / normalizer
          │
          │ domain semantics
          ▼
normalized inert value
          │
          ▼
POM-RX Core exact-value commitment
          │
          ├── bounded capture
          ├── exact transcript
          └── domain-separated SHA-256
          │
          ▼
authorization / Gate / evidence binding
```

The Core primitive does **not** parse JSON, validate MCP headers, decode EVM transactions or decide which fields belong in an action. Duplicate JSON member rejection remains the responsibility of the raw parser/normalization boundary because duplicate information has already been erased after ordinary JSON parsing.

## Required transcript semantics

Version 1 must be injective over the accepted value domain modulo SHA-256 collision assumptions.

Accepted semantic types:

- `null`;
- boolean;
- finite JavaScript Number;
- string;
- dense Array;
- plain record with string keys.

Rejected types include functions, symbols, BigInt unless a future version explicitly adds it, undefined values, Proxy objects, accessors, decorated/sparse arrays, custom prototypes and values outside Core capture budgets.

### Null and booleans

Use distinct type tags.

### Numbers

Commit the exact IEEE-754 binary64 representation rather than a decimal rendering. This must preserve at least:

```text
0 !== -0
```

for commitment purposes, even though JavaScript equality normally collapses them.

NaN and infinities remain outside the accepted plain-data domain.

### Strings

Commit exact JavaScript UTF-16 code units. Do not perform NFC/NFD normalization.

Therefore:

```text
"é" != "e\u0301"
```

for exact execution identity.

### Arrays

Array order and length are part of identity. Captured arrays must remain detached from later mutable `Array.prototype` behavior under the guarantees of the shared Core capture boundary.

### Records

Property insertion order must not change identity. Keys are sorted according to one documented deterministic ordering before transcript emission. Key text itself uses the exact string encoding above.

## Framing

Every value is explicitly type-tagged and length/framing information must make concatenation unambiguous. The design must not rely on delimiters that accepted values can ambiguously inject.

A transcript version identifier is mandatory. Changing accepted types, numeric representation, string representation, object ordering or framing requires a new transcript version.

## Domain separation

The caller must provide an explicit bounded domain identifier. A commitment is computed over at least:

```text
POM-RX exact-value version
+
domain
+
exact transcript
```

so the same value committed as an action, context or another semantic object cannot accidentally share an interchangeable commitment.

Domains are protocol identifiers, not user-controlled display labels. The implementation must validate their shape and length.

## Hash

Reference v1 uses SHA-256.

Claim boundary:

> Equality of commitments means equality under the reviewed transcript/domain contract except with the assumed collision resistance of SHA-256.

It does not prove that two domain objects have the same real-world meaning, that an external effect happened, or that an authorization was valid.

## Security invariants

1. No untrusted getter, Proxy trap or custom prototype executes while capturing accepted input under the stated Core assumptions.
2. Post-import mutation of load-bearing reflection, array, number, string or crypto intrinsics cannot silently alter a commitment.
3. The exact value used to calculate the commitment is the same detached captured value returned for downstream composition.
4. Object insertion order does not affect the commitment.
5. Array order does affect the commitment.
6. `0` and `-0` produce different commitments.
7. canonically equivalent but code-unit-distinct Unicode strings produce different commitments.
8. Changing the domain changes the commitment.
9. Exceeding capture/transcript budgets fails closed rather than truncating.
10. No integration-specific semantic rule is imported into Core.

## Stable fixtures

Implementation must commit stable fixtures for at least:

- null / true / false;
- 0 / -0 / representative finite numbers;
- empty/non-empty strings;
- composed/decomposed Unicode;
- empty/nested arrays;
- nested records;
- same object with different insertion orders;
- different domains over the same value.

Fixtures must be independently reproducible and become compatibility vectors for TypeScript/JavaScript or later language SDK implementations.

## Relationship to Proof Receipt canonicalization

Default decision: **separate contracts**.

Proof Receipt canonicalization is optimized for portable evidence. Exact-value commitment is optimized for execution identity. They may share implementation primitives only after an explicit compatibility proof shows that doing so does not collapse execution-relevant distinctions.

No current claim is made that the two contracts are interchangeable.

## Relationship to MCP #156

MCP remains responsible for:

- protocol/version/header checks;
- duplicate-key rejection before JSON parsing loses that information;
- JSON-RPC `tools/call` shape;
- selecting action versus context fields;
- target server identity semantics.

Once CORE-004 is accepted, MCP must delete its local transcript/hash implementation and call the shared Core primitive over its normalized action/context records. Until then the architectural P2 on #156 remains open.

## Dependency and implementation gate

Implementation is blocked until CORE-001/#150 (or accepted successor) establishes the shared hardened plain-data capture semantics on trusted main. The Core Team must not duplicate that capture boundary here merely to unblock MCP.

After the dependency passes:

1. implement one bounded Core module;
2. add stable fixtures and intrinsic-adversarial tests;
3. exact-head CI and distinct skeptical/security review;
4. merge and exact-merge-SHA assurance;
5. migrate MCP in a separate Integration-owned commit/PR head;
6. remove the application-local exact transcript only after identical intended vectors are demonstrated.

## Non-goals

- no authorization decision;
- no policy engine;
- no receipt/effect truth;
- no JSON parser;
- no blockchain requirement;
- no SWTK/POM-PERMIT dependency;
- no claim of legal/compliance semantics.
