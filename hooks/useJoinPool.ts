"use client";

import { useState, useMemo } from "react";
import { usePublicClient, useWriteContract, useReadContract } from "wagmi";
import { SancaPoolAbi } from "@/lib/abis";

/**
 * Hook untuk join pool
 */
export function useJoinPool(poolAddress: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  // Read pool info untuk calculate full collateral
  const { data: poolInfo } = useReadContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "getPoolInfo",
    query: {
      enabled: !!poolAddress,
    },
  });

  // Calculate full collateral needed
  const fullCollateral = useMemo(() => {
    if (!poolInfo) return undefined;
    // poolInfo structure: [state, maxMembers, currentMembers, contributionPerPeriod, ...]
    const maxMembers = poolInfo[1] as number;
    const contributionPerPeriod = poolInfo[3] as bigint;
    return contributionPerPeriod * BigInt(maxMembers);
  }, [poolInfo]);

  const {
    writeContractAsync,
  } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const join = async () => {
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
        functionName: "join",
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
        err instanceof Error ? err : new Error("Failed to join the pool");
      setIsPending(false);
      setIsConfirming(false);
      setError(nextError);
      throw nextError;
    }
  };

  return {
    join,
    fullCollateral,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    poolInfo,
  };
}

