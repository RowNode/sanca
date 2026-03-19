import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";

import type { DecisionHistoryEntry, DecisionHistoryEntryInput, HexAddress } from "./types.js";

const MAX_HISTORY_ROWS = 200;
const DEFAULT_HISTORY_DB_PATH = resolve(process.cwd(), "data", "keeper-history.db");
const historyDbPath = resolve(process.env.KEEPER_HISTORY_DB_PATH || DEFAULT_HISTORY_DB_PATH);

mkdirSync(dirname(historyDbPath), { recursive: true });

const db = new Database(historyDbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS decision_history (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    pool TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    tx_hash TEXT,
    execution_provider TEXT,
    reasoning_json TEXT NOT NULL,
    params_json TEXT,
    regime TEXT,
    decision_source TEXT NOT NULL,
    error TEXT
  )
`);

const insertDecisionStatement = db.prepare(`
  INSERT INTO decision_history (
    id,
    timestamp,
    pool,
    action,
    status,
    tx_hash,
    execution_provider,
    reasoning_json,
    params_json,
    regime,
    decision_source,
    error
  ) VALUES (
    @id,
    @timestamp,
    @pool,
    @action,
    @status,
    @txHash,
    @executionProvider,
    @reasoningJson,
    @paramsJson,
    @regime,
    @decisionSource,
    @error
  )
`);

const trimHistoryStatement = db.prepare(`
  DELETE FROM decision_history
  WHERE id NOT IN (
    SELECT id
    FROM decision_history
    ORDER BY timestamp DESC, id DESC
    LIMIT ${MAX_HISTORY_ROWS}
  )
`);

interface DecisionHistoryRow {
  id: string;
  timestamp: string;
  pool: string;
  action: DecisionHistoryEntry["action"];
  status: DecisionHistoryEntry["status"];
  tx_hash: string | null;
  execution_provider: DecisionHistoryEntry["executionProvider"];
  reasoning_json: string;
  params_json: string | null;
  regime: DecisionHistoryEntry["regime"];
  decision_source: DecisionHistoryEntry["decisionSource"];
  error: string | null;
}

function parseDecisionHistoryRow(row: DecisionHistoryRow): DecisionHistoryEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    pool: row.pool as HexAddress,
    action: row.action,
    status: row.status,
    txHash: row.tx_hash ? (row.tx_hash as HexAddress) : null,
    executionProvider: row.execution_provider,
    reasoning: JSON.parse(row.reasoning_json) as string[],
    params: row.params_json
      ? (JSON.parse(row.params_json) as DecisionHistoryEntry["params"])
      : null,
    regime: row.regime,
    decisionSource: row.decision_source,
    error: row.error ?? undefined,
  };
}

export function recordDecision(entry: DecisionHistoryEntryInput): void {
  insertDecisionStatement.run({
    id: `${Date.now()}-${randomUUID()}`,
    timestamp: new Date().toISOString(),
    pool: entry.pool,
    action: entry.action,
    status: entry.status,
    txHash: entry.txHash,
    executionProvider: entry.executionProvider,
    reasoningJson: JSON.stringify(entry.reasoning),
    paramsJson: entry.params ? JSON.stringify(entry.params) : null,
    regime: entry.regime,
    decisionSource: entry.decisionSource,
    error: entry.error ?? null,
  });

  trimHistoryStatement.run();
}

export function listDecisions(pool?: string | string[]): DecisionHistoryEntry[] {
  const targetPool = Array.isArray(pool) ? pool[0] : pool;
  const rows = targetPool
    ? (db
        .prepare(
          `
            SELECT *
            FROM decision_history
            WHERE lower(pool) = lower(?)
            ORDER BY timestamp DESC, id DESC
          `,
        )
        .all(String(targetPool)) as DecisionHistoryRow[])
    : (db
        .prepare(
          `
            SELECT *
            FROM decision_history
            ORDER BY timestamp DESC, id DESC
          `,
        )
        .all() as DecisionHistoryRow[]);

  return rows.map(parseDecisionHistoryRow);
}

export function asHexAddress(value: string): HexAddress {
  return value as HexAddress;
}
