import { onchainTable } from "ponder";

// Pool = 1 SancaPool clone
export const pools = onchainTable("pools", (t) => ({
  id: t.text().primaryKey(), // pool address
  creator: t.text().notNull(),
  name: t.text().notNull(),
  description: t.text().notNull(),
  maxMembers: t.integer().notNull(),
  contributionPerPeriod: t.bigint().notNull(),
  periodDuration: t.bigint().notNull(),
  yieldBonusSplit: t.integer().notNull(),
  // Derived / dynamic fields updated by pool events
  state: t.text().notNull(), // "Open" | "Active" | "Completed"
  currentCycle: t.integer().notNull(),
  totalCycles: t.integer().notNull(),
  cycleStartTime: t.bigint().notNull(),
  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
}));

// Member of a pool
export const members = onchainTable("members", (t) => ({
  // `${poolAddress}-${memberAddress}`
  id: t.text().primaryKey(),
  poolId: t.text().notNull(),
  address: t.text().notNull(),
  contribution: t.bigint().notNull(),
  joinedAtBlock: t.bigint().notNull(),
  joinedAtTimestamp: t.bigint().notNull(),
}));

// Cycle within a pool
export const cycles = onchainTable("cycles", (t) => ({
  // `${poolAddress}-${cycleIndex}`
  id: t.text().primaryKey(),
  poolId: t.text().notNull(),
  index: t.integer().notNull(),
  winner: t.text().notNull(),
  prize: t.bigint().notNull(),
  yieldBonus: t.bigint().notNull(),
  compounded: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
}));

// Cycle contributions (per member per cycle)
export const cycleContributions = onchainTable("cycleContributions", (t) => ({
  // `${poolAddress}-${cycleIndex}-${memberAddress}`
  id: t.text().primaryKey(),
  poolId: t.text().notNull(),
  cycleIndex: t.integer().notNull(),
  memberAddress: t.text().notNull(),
  amount: t.bigint().notNull(),
  isLiquidated: t.boolean().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
}));

