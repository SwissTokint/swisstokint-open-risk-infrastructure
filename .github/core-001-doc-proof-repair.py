from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one match in {path}, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


doc = 'core/gate/DURABLE-COMPOSITION.md'
replace_once(
    doc,
    "If downstream succeeds, the local Gate reaches `CONSUMED_SUCCESS` and the composition persists `CONSUMED_SUCCESS` before returning the downstream result. If downstream fails, the local Gate reaches `CONSUMED_ERROR`; the composition persists `CONSUMED_ERROR` before propagating the Gate's downstream-failure diagnostic.\n",
    "If downstream succeeds, the local Gate reaches `CONSUMED_SUCCESS` and the composition persists `CONSUMED_SUCCESS` before returning the downstream result. A synchronous throw from `executeDownstream` before it returns a result channel is locally classifiable as `CONSUMED_ERROR`, and the composition persists `CONSUMED_ERROR` before reporting that synchronous failure. Once a result channel exists, an asynchronous rejection is not treated as proof that the external effect failed: the local Gate becomes `CONSUMED_UNKNOWN`, the verified process-local claim descriptor is released, and the durable tombstone remains `RESERVED` without a success/error terminal marker.\n",
)
replace_once(
    doc,
    "Durable result channels themselves are also isolated from post-import `Promise.prototype.constructor` / `Promise.prototype.then` mutation. Promise-producing filesystem wrappers, durable operation channels and public durable-store result promises are stabilized with captured Promise intrinsics before they are awaited or exposed, so a mutable inherited Promise prototype cannot observe one capability's claim result and substitute another capability's opaque handle. The regression contract is the security invariant—claim/result-channel non-substitutability—not a claim that no unrelated native Promise in the process can ever dispatch through a subsequently modified prototype.\n",
    "Durable result channels themselves are also isolated from post-import `Promise.prototype.constructor` / `Promise.prototype.then` mutation. Promise-producing filesystem wrappers, durable operation channels and public durable-store result promises are stabilized with captured Promise intrinsics before they are awaited or exposed, so a mutable inherited Promise prototype cannot observe one capability's claim result and substitute another capability's opaque handle. Public promises created by the composed Gate additionally own a null-prototype constructor carrier whose immutable `Symbol.species` points to the captured intrinsic Promise, plus a Core-owned `then` dispatch; direct `.then()` and inherited `.finally()` therefore do not consult a later mutation of `Promise[Symbol.species]`. The regression contract is the security invariant—claim/result-channel non-substitutability and stable public result semantics—not a claim that no unrelated native Promise in the process can ever dispatch through a subsequently modified prototype.\n",
)

test_path = 'tests/pom-rx-core-durable-merge-blocker-regressions.node.test.mjs'
replace_once(
    test_path,
    "import { mkdtemp, rm } from 'node:fs/promises';\n",
    "import { mkdtemp, readFile, rm } from 'node:fs/promises';\n",
)

p = Path(test_path)
text = p.read_text()
name = 'durable composition documentation preserves synchronous-vs-ambiguous downstream truth'
if name in text:
    raise SystemExit('documentation regression already present')
text += """

test(
  'durable composition documentation preserves synchronous-vs-ambiguous downstream truth',
  async () => {
    const document = await readFile(
      new URL('../core/gate/DURABLE-COMPOSITION.md', import.meta.url),
      'utf8',
    );
    assert.match(
      document,
      /A synchronous throw from `executeDownstream` before it returns a result channel is locally classifiable as `CONSUMED_ERROR`/u,
    );
    assert.match(
      document,
      /Once a result channel exists, an asynchronous rejection is not treated as proof that the external effect failed/u,
    );
    assert.doesNotMatch(
      document,
      /If downstream fails, the local Gate reaches `CONSUMED_ERROR`/u,
    );
    assert.match(
      document,
      /inherited `\.finally\(\)` therefore do not consult a later mutation of `Promise\[Symbol\.species\]`/u,
    );
  },
);
"""
p.write_text(text)
