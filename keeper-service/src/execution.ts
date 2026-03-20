import { SancaPoolAbi } from "./abi.js";
import { publicClient, walletClient } from "./clients.js";
import type { ExecuteKeeperActionInput, ExecuteKeeperActionResult, RebalanceParams } from "./types.js";
import { config, hasExecutionConfig } from "./config.js";

export function isLikelyRevert(err: unknown): boolean {
  const message = String(
    (err as { shortMessage?: string; message?: string } | null)?.shortMessage ||
      (err as { message?: string } | null)?.message ||
      err ||
      "",
  ).toLowerCase();
  return message.includes("revert") || message.includes("execution reverted");
}

export function canExecuteTransactions(): boolean {
  return hasExecutionConfig() && Boolean(walletClient);
}

function alignToTickSpacing(value: number): number {
  return Math.round(value / config.tickSpacing) * config.tickSpacing;
}

export function sanitizeRebalanceParams(params: RebalanceParams): RebalanceParams {
  const rawBaseLower = Number(params.baseLower);
  const rawBaseUpper = Number(params.baseUpper);
  const rawLimitLower = Number(params.limitLower);
  const rawLimitUpper = Number(params.limitUpper);

  if (
    !Number.isFinite(rawBaseLower) ||
    !Number.isFinite(rawBaseUpper) ||
    !Number.isFinite(rawLimitLower) ||
    !Number.isFinite(rawLimitUpper)
  ) {
    throw new Error("Invalid rebalance params: all range bounds must be finite numbers");
  }

  const sanitized: RebalanceParams = {
    baseLower: alignToTickSpacing(rawBaseLower),
    baseUpper: alignToTickSpacing(rawBaseUpper),
    limitLower: alignToTickSpacing(rawLimitLower),
    limitUpper: alignToTickSpacing(rawLimitUpper),
    swapQuantity: BigInt(params.swapQuantity ?? "0").toString(),
  };

  if (sanitized.baseLower >= sanitized.baseUpper) {
    throw new Error("Invalid rebalance params: baseLower must be lower than baseUpper");
  }

  if (sanitized.limitLower >= sanitized.limitUpper) {
    throw new Error("Invalid rebalance params: limitLower must be lower than limitUpper");
  }

  if (sanitized.limitLower >= sanitized.baseLower) {
    throw new Error("Invalid rebalance params: limitLower must be lower than baseLower");
  }

  if (sanitized.limitUpper <= sanitized.baseUpper) {
    throw new Error("Invalid rebalance params: limitUpper must be higher than baseUpper");
  }

  return sanitized;
}

async function simulateKeeperAction({
  poolAddress,
  decision,
  params,
}: ExecuteKeeperActionInput & { params: RebalanceParams | null }): Promise<RebalanceParams | null> {
  if (!walletClient?.account) {
    throw new Error("No viem wallet client configured");
  }

  if (decision === "collectFees") {
    await publicClient.simulateContract({
      account: walletClient.account,
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "keeperCollectFees",
      args: [],
    });

    return null;
  }

  if (!params) {
    throw new Error("Missing rebalance params");
  }

  const sanitizedParams = sanitizeRebalanceParams(params);

  await publicClient.simulateContract({
    account: walletClient.account,
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "keeperRebalance",
    args: [
      sanitizedParams.baseLower,
      sanitizedParams.baseUpper,
      sanitizedParams.limitLower,
      sanitizedParams.limitUpper,
      BigInt(sanitizedParams.swapQuantity),
    ],
  });

  return sanitizedParams;
}

export async function executeKeeperAction({
  poolAddress,
  decision,
  params,
}: ExecuteKeeperActionInput): Promise<ExecuteKeeperActionResult> {
  if (!walletClient) {
    throw new Error("No viem wallet client configured");
  }

  const sanitizedParams = await simulateKeeperAction({ poolAddress, decision, params });

  if (decision === "collectFees") {
    const txHash = await walletClient.writeContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "keeperCollectFees",
      args: [],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash, executionProvider: "viem", appliedParams: null };
  }

  if (!sanitizedParams) {
    throw new Error("Missing rebalance params");
  }

  const txHash = await walletClient.writeContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "keeperRebalance",
    args: [
      sanitizedParams.baseLower,
      sanitizedParams.baseUpper,
      sanitizedParams.limitLower,
      sanitizedParams.limitUpper,
      BigInt(sanitizedParams.swapQuantity),
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash, executionProvider: "viem", appliedParams: sanitizedParams };
}
