import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const layoutPath = 'docs/product/POM_RX_REPOSITORY_LAYOUT.json';
const layout = JSON.parse(readFileSync(layoutPath, 'utf8'));

const requiredReadmes = [
  'ARCHITECTURE.md',
  'core/README.md',
  'profiles/README.md',
  'profiles/governance-dagr/README.md',
  'applications/README.md',
  'applications/payments-financial/README.md',
  'applications/ai-agents/README.md',
  'applications/enterprise-apis/README.md',
  'applications/cybersecurity/README.md',
  'applications/blockchain-digital-assets/README.md',
  'applications/blockchain-digital-assets/wallet-guard/README.md',
  'integrations/README.md',
  'integrations/filecoin/README.md',
  'compatibility/pom-rx-v0.1/README.md',
  'tooling/README.md',
];

function expectExisting(paths, label) {
  for (const path of paths) {
    assert.equal(existsSync(path), true, `${label} missing: ${path}`);
  }
}

test('repository layout exposes every product-oriented ownership block', () => {
  assert.equal(layout.schema_version, 'pom-rx-repository-layout/1');
  assert.equal(layout.product, 'POM-RX');
  expectExisting(requiredReadmes, 'ownership marker');

  assert.deepEqual(
    layout.applications.map(({ name }) => name),
    [
      'Payments and financial operations',
      'AI agents',
      'APIs and enterprise systems',
      'Cybersecurity',
      'Blockchain and digital assets',
      'POM-RX Wallet Guard',
    ],
  );

  const applicationDirectories = layout.applications.map(({ directory }) => directory);
  assert.equal(new Set(applicationDirectories).size, applicationDirectories.length);
  expectExisting(applicationDirectories, 'application directory');
});

test('machine-readable ownership map points only to current canonical paths that exist', () => {
  expectExisting(layout.core.current_canonical_paths, 'core canonical path');
  expectExisting(
    layout.supporting_infrastructure.current_canonical_paths,
    'supporting integration canonical path',
  );
  expectExisting(
    layout.supporting_infrastructure.compatibility_aliases ?? [],
    'supporting integration compatibility alias',
  );
  expectExisting(layout.tooling.current_canonical_paths, 'tooling canonical path');
});

test('layout preserves frozen v0.1 paths instead of performing a cosmetic move', () => {
  expectExisting(layout.compatibility.protected_paths, 'protected path');

  const compatibility = readFileSync('compatibility/pom-rx-v0.1/README.md', 'utf8');
  assert.match(compatibility, /future physical move requires byte\/hash parity/i);
  assert.match(compatibility, /ownership marker, not a replacement path/i);
});

test('application blocks cannot be described as owners of duplicated shared semantics', () => {
  const applications = readFileSync('applications/README.md', 'utf8');
  const core = readFileSync('core/README.md', 'utf8');
  assert.match(applications, /do not own competing copies/i);
  assert.match(core, /must not duplicate canonicalization, hashing, verifier, Witness or Gate/i);
});
