import { useState } from "react";
import { usePublicClient, useWriteContract, useReadContract } from "wagmi";
import { SancaPoolAbi } from "@/lib/abis";

export function useContribute(poolAddress: `0x${string}` | undefined) {
  const publicClient = usePublicClient();

  // Read pool's contributionPerPeriod
  const { data: poolConfig } = useReadContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "getPoolInfo",
    query: {
      enabled: !!poolAddress,
    },
  });

  const contributionPerPeriod = poolConfig ? poolConfig[3] : BigInt(0);

  const {
    writeContractAsync,
  } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const contribute = async () => {
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
        functionName: "contribute",
        args: [],
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
        err instanceof Error ? err : new Error("Failed to contribute");
      setIsPending(false);
      setIsConfirming(false);
      setError(nextError);
      throw nextError;
    }
  };

  return {
    contribute,
    contributionPerPeriod,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

