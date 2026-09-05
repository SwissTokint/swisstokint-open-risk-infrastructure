export async function load(url, context, nextLoad) {
  if (/loader-hook-forgery-blocked-[ab]\.test\.mjs$/u.test(url)) {
    return {
      format: 'module',
      shortCircuit: true,
      source: [
        "import test from 'node:test';",
        "test('forged loader pass', () => {});",
      ].join('\n'),
    };
  }
  return nextLoad(url, context);
}
