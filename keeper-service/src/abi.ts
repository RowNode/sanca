import { parseAbiItem } from "viem";

export const SancaPoolAbi = [
  parseAbiItem("function state() view returns (uint8)"),
  parseAbiItem("function bonzoVault() view returns (address)"),
  parseAbiItem(
    "function getPoolInfo() view returns (uint8,uint8,uint256,uint256,uint256,uint8,uint256,uint256,uint256,uint256,uint256)",
  ),
  parseAbiItem("function totalDeposited() view returns (uint256)"),
  parseAbiItem("function keeper() view returns (address)"),
  parseAbiItem("function poolName() view returns (string)"),
  parseAbiItem("function poolDescription() view returns (string)"),
  parseAbiItem(
    "function keeperRebalance(int24 baseLower, int24 baseUpper, int24 limitLower, int24 limitUpper, int256 swapQuantity)",
  ),
  parseAbiItem("function keeperCollectFees()"),
] as const;

export const SancaFactoryAbi = [parseAbiItem("function getAllPools() view returns (address[])")] as const;

export const MockBonzoVaultAbi = [
  parseAbiItem("function totalAssets() view returns (uint256)"),
  parseAbiItem("function currentTick() view returns (int24)"),
  parseAbiItem("function baseLower() view returns (int24)"),
  parseAbiItem("function baseUpper() view returns (int24)"),
  parseAbiItem("function limitLower() view returns (int24)"),
  parseAbiItem("function limitUpper() view returns (int24)"),
  parseAbiItem("function pendingFeeAssets() view returns (uint256)"),
  parseAbiItem("function rebalanceCount() view returns (uint256)"),
  parseAbiItem("function lastRebalanceAt() view returns (uint256)"),
] as const;

export const SaucerSwapPoolAbi = [
  parseAbiItem("function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"),
  parseAbiItem("function observe(uint32[] secondsAgos) view returns (int56[],uint160[])"),
  parseAbiItem("function token0() view returns (address)"),
  parseAbiItem("function token1() view returns (address)"),
] as const;

export const Erc20MetadataAbi = [
  parseAbiItem("function symbol() view returns (string)"),
  parseAbiItem("function decimals() view returns (uint8)"),
] as const;
