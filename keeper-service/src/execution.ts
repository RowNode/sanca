import { SancaPoolAbi } from "./abi.js";
import { publicClient, walletClient } from "./clients.js";
import type { ExecuteKeeperActionInput, ExecuteKeeperActionResult } from "./types.js";
import { hasExecutionConfig } from "./config.js";

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

export async function executeKeeperAction({
  poolAddress,
  decision,
  params,
}: ExecuteKeeperActionInput): Promise<ExecuteKeeperActionResult> {
  if (!walletClient) {
    throw new Error("No viem wallet client configured");
  }

  if (decision === "collectFees") {
    const txHash = await walletClient.writeContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "keeperCollectFees",
      args: [],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash, executionProvider: "viem" };
  }

  if (!params) {
    throw new Error("Missing rebalance params");
  }

  const txHash = await walletClient.writeContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "keeperRebalance",
    args: [
      params.baseLower,
      params.baseUpper,
      params.limitLower,
      params.limitUpper,
      BigInt(params.swapQuantity),
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash, executionProvider: "viem" };
}
