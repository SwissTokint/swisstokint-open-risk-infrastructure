import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRiskRules } from './risk-engine.js';

test('returns transparent risk results for a normalized snapshot', () => {
  const results = evaluateRiskRules(
    {
      symbol: 'ETH-USD',
      observedAt: '2026-07-24T12:00:00.000Z',
      price: 108,
      referencePrice: 100,
      spreadBps: 22,
      volume24h: 900,
    },
    [
      { id: 'move-5', type: 'price_move_percent', threshold: 5, severity: 'warning' },
      { id: 'spread-20', type: 'spread_bps', threshold: 20, severity: 'critical' },
      { id: 'volume-1000', type: 'minimum_volume', threshold: 1000, severity: 'info' },
    ],
  );

  assert.equal(results.length, 3);
  assert.equal(results.every((result) => result.triggered), true);
  assert.equal(results[0].inputs.movePercent, 8);
  assert.match(results[1].explanation, /22.00 bps/);
});
