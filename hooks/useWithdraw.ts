"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { SancaPoolAbi } from "@/lib/abis";

/**
 * Hook untuk withdraw funds setelah pool completed
 */
export function useWithdraw(poolAddress: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const {
    writeContractAsync,
  } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const withdraw = async () => {
    if (!poolAddress) {
      throw new Error("Pool address is required");
    }
    if (!publicClient) {
      throw new Error("Public client is not available");
    }

    setError(null);
    setIsSuccess(false);
    setIsPending(true);

    try {
      const nextHash = await writeContractAsync({
        address: poolAddress,
        abi: SancaPoolAbi,
        functionName: "withdraw",
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
        err instanceof Error ? err : new Error("Failed to withdraw funds");
      setIsPending(false);
      setIsConfirming(false);
      setError(nextError);
      throw nextError;
    }
  };

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

