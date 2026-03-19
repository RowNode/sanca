"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SancaFactoryAbi } from "@/lib/abis";
import { CONTRACTS } from "@/lib/contracts";
import { parseUnits } from "viem";

/**
 * Hook untuk create pool via SancaFactory
 */
export function useCreatePool() {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createPool = async (params: {
    maxMembers: number;
    contributionPerPeriod: number; // in USDC (will be converted to 6 decimals)
    periodDuration: number; // in days (will be converted to seconds)
    yieldBonusSplit: number; // percentage 0-100
    poolName: string;
    poolDescription: string;
  }) => {
    // Convert contribution to 6 decimals (USDC has 6 decimals)
    const contributionInWei = parseUnits(
      params.contributionPerPeriod.toString(),
      6
    );

    // Convert days to seconds
    const periodDurationInSeconds = BigInt(params.periodDuration * 24 * 60 * 60);

    writeContract({
      address: CONTRACTS.FACTORY,
      abi: SancaFactoryAbi,
      functionName: "createPool",
      args: [
        params.maxMembers,
        contributionInWei,
        periodDurationInSeconds,
        params.yieldBonusSplit,
        params.poolName,
        params.poolDescription,
      ],
    });
  };

  return {
    createPool,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

