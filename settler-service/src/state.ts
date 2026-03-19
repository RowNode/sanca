import type { HexAddress, PoolRuntimeState } from "./types.js";

export const poolsState = new Map<HexAddress, PoolRuntimeState>();
export const unwatchers: Array<() => void> = [];

export function getOrCreatePoolState(poolAddress: HexAddress): PoolRuntimeState {
  const current = poolsState.get(poolAddress);
  if (current) return current;

  const created: PoolRuntimeState = {
    retries: 0,
    timer: null,
  };
  poolsState.set(poolAddress, created);
  return created;
}

export function clearPoolTimer(poolAddress: HexAddress): void {
  const state = poolsState.get(poolAddress);
  if (state?.timer) clearTimeout(state.timer);
  if (state) state.timer = null;
}
