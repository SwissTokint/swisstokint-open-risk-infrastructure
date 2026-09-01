from pathlib import Path

path = Path('tests/pom-rx-core-durable-merge-blocker-regressions.node.test.mjs')
text = path.read_text()

old = """    let evidence;
    let rejectDownstream;
    let intercepts = 0;
    const downstreamPromise = new Promise((_resolve, reject) => {
      rejectDownstream = reject;
    });
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => downstreamPromise,
    });
"""
new = """    let evidence;
    let rejectDownstream;
    let notifyDownstreamStarted;
    let intercepts = 0;
    const downstreamPromise = new Promise((_resolve, reject) => {
      rejectDownstream = reject;
    });
    const downstreamStarted = new Promise((resolve) => {
      notifyDownstreamStarted = resolve;
    });
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => {
        notifyDownstreamStarted();
        return downstreamPromise;
      },
    });
"""
if text.count(old) != 1:
    raise SystemExit('direct Promise setup marker mismatch')
text = text.replace(old, new, 1)

old = """      const consumePromise = harness.gate.consume(issued.capability, { raw: true });
      queueMicrotask(() => rejectDownstream(new Error('real downstream rejection')));
"""
new = """      const consumePromise = harness.gate.consume(issued.capability, { raw: true });
      await downstreamStarted;
      queueMicrotask(() => rejectDownstream(new Error('real downstream rejection')));
"""
if text.count(old) != 1:
    raise SystemExit('direct Promise rejection marker mismatch')
text = text.replace(old, new, 1)

path.write_text(text)
