# Tezos Proof Commitment Registry

Status: SmartPy specification and JsLIGO implementation prepared; compilation
is enforced in GitHub CI with LIGO 1.15.6; Shadownet origination pending.

This integration stores only 32-byte commitment values and a public issuer. It
contains no token, payment, administrator, custody, exchange credential or
trade-execution path.

## Lifecycle

1. `register` creates a batch once and binds it to `sp.sender`.
2. `verify` checks the four exact 32-byte values and revocation state.
3. `revoke` is available only to the original issuer.
4. A batch identifier cannot be overwritten or reused.

## Security properties covered by the scenario

- exact 32-byte commitment lengths;
- first-write-wins batch identity;
- unauthorized revocation rejection;
- explicit revocation state;
- view returns false after revocation.

## Compile and test

Use SmartPy 0.24.1 on a supported Linux/macOS environment or the official
SmartPy web IDE:

```bash
pip install smartpy-tezos==0.24.1
python proof_registry.py
```

SmartPy currently installs on Windows but its local compiler runtime reports
Windows AMD64 as unsupported. SwissTokint therefore keeps the source in the
repository as an executable specification. Docker is not started automatically
on the operator workstation because the live trading service may share that
runtime.

The independently implemented JsLIGO contract is compiled on an isolated
GitHub runner:

```bash
docker run --rm -v "$PWD:/project" -w /project ligolang/ligo:1.15.6 \
  compile contract \
  integrations/tezos-proof-registry/proof_registry.jsligo \
  -m ProofRegistry --skip-analytics
```

The workflow also compiles the empty initial big-map storage and rejects empty
artifacts. A successful CI result is required before the contract can be
presented as compiling.

The intended public test network is Shadownet, the current long-running Tezos
application testnet. Compilation evidence and a `KT1` address must be added
before any grant application is submitted.
