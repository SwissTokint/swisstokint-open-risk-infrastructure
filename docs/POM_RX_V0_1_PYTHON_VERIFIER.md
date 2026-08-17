# POM-RX v0.1 Python verifier

Status: local second-language implementation for the existing `pom-rx/0.1`
three-phase receipt profile. It is not POM-RX v0.2, an external reproduction,
a gate implementation or an assertion about a live action.

`sdk/python/pom_rx.py` validates the v0.1 receipt shape, canonical commitment,
hash-linked phase transitions, policy and method continuity, time ordering and
allow, deny, execution and reconciliation constraints. Its shared fixture is
`schemas/examples/pom-rx-v0.1.cross-language.json`.

Run the TypeScript and Python checks together:

```powershell
npm run test:proof
```

Verify a saved bundle through the Python command-line entry point:

```powershell
python scripts/verify-pom-rx-v0.1.py schemas/examples/pom-rx-v0.1.cross-language.json
```

The command is offline. It accepts a JSON receipt array or a vector with a
`chain` member, rejects duplicate JSON object keys and non-finite numbers, and
limits the input to 256 KiB. When a vector also supplies `expected`, the
command fails if its independently calculated result differs from that value.

The shared vector is accepted by both implementations. Changed hash links,
policy substitution, unknown fields and a denied preflight followed by
execution are rejected. The two implementations are maintained in the same
repository, so they are not an external reproduction or independent security
review.

The verifier does not inspect a provider, testnet, wallet, account, policy
engine, source signature, witness, gate-consumption record or native execution
reference. Those missing roles remain explicit v0.2 migration gates in
`docs/POM_RX_V0_2_STATUS_BOUNDARY.md`.
