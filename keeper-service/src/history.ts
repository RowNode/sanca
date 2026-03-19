import type { DecisionHistoryEntry, DecisionHistoryEntryInput, HexAddress } from "./types.js";

const decisionHistory: DecisionHistoryEntry[] = [];

export function recordDecision(entry: DecisionHistoryEntryInput): void {
  decisionHistory.unshift({
    id: `${Date.now()}-${entry.pool}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });

  if (decisionHistory.length > 200) {
    decisionHistory.length = 200;
  }
}

export function listDecisions(pool?: string | string[]): DecisionHistoryEntry[] {
  const targetPool = Array.isArray(pool) ? pool[0] : pool;
  if (!targetPool) return decisionHistory;
  return decisionHistory.filter(
    (entry) => entry.pool.toLowerCase() === String(targetPool).toLowerCase(),
  );
}

export function asHexAddress(value: string): HexAddress {
  return value as HexAddress;
}
