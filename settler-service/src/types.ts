export type HexAddress = `0x${string}`;

export interface PoolRuntimeState {
  nextSettleAtSec?: bigint;
  currentCycle?: bigint;
  retries: number;
  timer: NodeJS.Timeout | null;
}

export interface PoolSchedule {
  state: bigint;
  currentCycle: bigint;
  cycleStartTime: bigint;
  periodDuration: bigint;
  completed: boolean;
  settleAt: bigint;
}

export interface PoolStatusResponse {
  address: HexAddress;
  canSettle: boolean;
  state: string;
  currentCycle: string;
  completed: boolean;
  nowSec: string;
  settleAtSec: string;
  nextSettleAtSec: string | null;
  retries: number;
}
