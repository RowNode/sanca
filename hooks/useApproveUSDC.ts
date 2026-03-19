"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { erc20Abi } from "viem";

/**
 * Hook untuk approve USDC spending
 */
export function useApproveUSDC() {
  const publicClient = usePublicClient();
  const {
    writeContractAsync,
  } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const approve = async (spender: `0x${string}`, amount: bigint) => {
    if (!publicClient) {
      throw new Error("Public client is not available");
    }

    setError(null);
    setIsSuccess(false);
    setIsPending(true);

    try {
      const nextHash = await writeContractAsync({
        address: CONTRACTS.USDC,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount],
      });

      setHash(nextHash);
      setIsPending(false);
      setIsConfirming(true);

      await publicClient.waitForTransactionReceipt({ hash: nextHash });

      setIsConfirming(false);
      setIsSuccess(true);
      return nextHash;
    } catch (err) {
      const nextError =
        err instanceof Error ? err : new Error("Failed to approve USDC");
      setIsPending(false);
      setIsConfirming(false);
      setError(nextError);
      throw nextError;
    }
  };

  const approveMax = async (spender: `0x${string}`) => {
    // Max uint256
    const maxAmount = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    approve(spender, maxAmount);
  };

  return {
    approve,
    approveMax,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

