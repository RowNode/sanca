import { parseAbiItem } from "viem";

export const SancaPoolAbi = [
  parseAbiItem("function state() view returns (uint8)"),
  parseAbiItem("function currentCycle() view returns (uint256)"),
  parseAbiItem("function cycleStartTime() view returns (uint256)"),
  parseAbiItem("function periodDuration() view returns (uint256)"),
  parseAbiItem("function cycleCompleted(uint256) view returns (bool)"),
  parseAbiItem("function settleCycle()"),
  parseAbiItem("event PoolStarted(uint256 startTime, uint256 totalCycles)"),
  parseAbiItem("event CycleEnded(uint256 indexed cycle)"),
  parseAbiItem("event PoolCompleted()"),
] as const;

export const SancaFactoryAbi = [
  parseAbiItem("function getAllPools() view returns (address[])"),
  parseAbiItem(
    "event PoolCreated(address indexed pool, address indexed creator, uint8 maxMembers, uint256 contributionPerPeriod, uint256 periodDuration, uint8 yieldBonusSplit, string poolName, string poolDescription)",
  ),
] as const;
