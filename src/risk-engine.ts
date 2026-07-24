export type Severity = 'info' | 'warning' | 'critical';

export type MarketSnapshot = {
  symbol: string;
  observedAt: string;
  price: number;
  referencePrice: number;
  spreadBps: number;
  volume24h: number;
};

export type RiskRule =
  | { id: string; type: 'price_move_percent'; threshold: number; severity: Severity }
  | { id: string; type: 'spread_bps'; threshold: number; severity: Severity }
  | { id: string; type: 'minimum_volume'; threshold: number; severity: Severity };

export type RiskResult = {
  ruleId: string;
  triggered: boolean;
  severity: Severity;
  inputs: Record<string, number>;
  explanation: string;
};

const percentMove = (price: number, referencePrice: number) => {
  if (referencePrice <= 0) throw new Error('referencePrice must be greater than zero');
  return ((price - referencePrice) / referencePrice) * 100;
};

export function evaluateRiskRules(snapshot: MarketSnapshot, rules: RiskRule[]): RiskResult[] {
  if (!snapshot.symbol.trim()) throw new Error('symbol is required');
  if (![snapshot.price, snapshot.referencePrice, snapshot.spreadBps, snapshot.volume24h].every(Number.isFinite)) {
    throw new Error('market snapshot contains a non-finite value');
  }

  return rules.map<RiskResult>((rule): RiskResult => {
    if (rule.threshold < 0 || !Number.isFinite(rule.threshold)) throw new Error(`invalid threshold for ${rule.id}`);

    if (rule.type === 'price_move_percent') {
      const move = percentMove(snapshot.price, snapshot.referencePrice);
      const triggered = Math.abs(move) >= rule.threshold;
      return {
        ruleId: rule.id,
        triggered,
        severity: rule.severity,
        inputs: { price: snapshot.price, referencePrice: snapshot.referencePrice, movePercent: move, threshold: rule.threshold },
        explanation: `Price moved ${move.toFixed(2)}% against a ${rule.threshold.toFixed(2)}% threshold.`,
      };
    }

    if (rule.type === 'spread_bps') {
      const triggered = snapshot.spreadBps >= rule.threshold;
      return {
        ruleId: rule.id,
        triggered,
        severity: rule.severity,
        inputs: { spreadBps: snapshot.spreadBps, threshold: rule.threshold },
        explanation: `Spread is ${snapshot.spreadBps.toFixed(2)} bps against a ${rule.threshold.toFixed(2)} bps threshold.`,
      };
    }

    const triggered = snapshot.volume24h < rule.threshold;
    return {
      ruleId: rule.id,
      triggered,
      severity: rule.severity,
      inputs: { volume24h: snapshot.volume24h, threshold: rule.threshold },
      explanation: `24h volume is ${snapshot.volume24h.toFixed(2)} against a minimum of ${rule.threshold.toFixed(2)}.`,
    };
  });
}
