# POM-RX repository architecture

POM-RX is the single principal technical product in this repository.

The repository is organized by ownership and capability, not by every historical file path. This layout is additive and compatibility-preserving: frozen POM-RX v0.1 verifier/fixture paths are not moved by this change.

```text
POM-RX
├── core/
│   ├── preflight / policy
│   ├── strict verification
│   ├── exact authorization
│   ├── witness
│   ├── single-use gate
│   ├── observation
│   └── reconciliation
├── profiles/
│   └── governance-dagr/
├── applications/
│   ├── payments-financial/
│   ├── ai-agents/
│   ├── enterprise-apis/
│   ├── cybersecurity/
│   └── blockchain-digital-assets/
│       └── wallet-guard/
├── integrations/
├── compatibility/
│   └── pom-rx-v0.1/
└── tooling/
```

## Migration rule

1. New domain-specific work goes under its application/profile/integration owner.
2. Shared semantics must not be duplicated outside the common Core.
3. Existing canonical runtime paths remain in place until a dedicated compatibility PR proves import, checksum, fixture and public-link stability.
4. `sdk/`, `fixtures/`, `schemas/`, `scripts/` and existing integration paths remain valid source locations during migration.
5. A physical move of legacy/frozen material is never cosmetic; it requires an explicit migration plan and regression evidence.

Machine-readable ownership and protected paths are defined in `docs/product/POM_RX_REPOSITORY_LAYOUT.json`.
