"use client";

import { Button } from "@/components/ui/button";
import { useAccount, useReadContract } from "wagmi";
import { SancaPoolAbi } from "@/lib/abis";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useWithdraw } from "@/hooks/useWithdraw";
import { formatUSDC } from "@/lib/utils";
import { toBigInt } from "@/lib/utils";
import {
  TransactionFlowDialog,
  type TransactionFlowStep,
} from "@/components/circles/transaction-flow-dialog";
import { formatAddress } from "@/lib/utils";

interface WithdrawButtonProps {
  poolAddress: `0x${string}`;
  poolState: "Open" | "Active" | "Completed";
}

export function WithdrawButton({
  poolAddress,
  poolState,
}: WithdrawButtonProps) {
  const { address, isConnected } = useAccount();
  const { withdraw } = useWithdraw(poolAddress);

  // Check member's remaining collateral
  const { data: memberCollateral, refetch: refetchCollateral } = useReadContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "memberCollateral",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!poolAddress && poolState === "Completed",
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stepState, setStepState] = useState<{
    status: "queued" | "pending" | "success" | "error";
    txHash?: `0x${string}`;
    errorMessage?: string;
  }>({
    status: "queued",
  });

  // Don't show if pool is not completed
  if (poolState !== "Completed") {
    return null;
  }

  // Don't show if user is not connected
  if (!isConnected) {
    return (
      <Button disabled className="w-full">
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet to Withdraw
      </Button>
    );
  }

  const remainingCollateral = memberCollateral
    ? toBigInt(memberCollateral)
    : BigInt(0);
  const hasRemainingCollateral = remainingCollateral > BigInt(0);

  const runWithdraw = async () => {
    setIsDialogOpen(true);
    setIsRunning(true);
    setStepState({
      status: "pending",
      txHash: undefined,
      errorMessage: undefined,
    });

    try {
      const hash = await withdraw();
      await refetchCollateral();
      setStepState({
        status: "success",
        txHash: hash,
      });
      toast.success("Funds withdrawn successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to withdraw";
      setStepState({
        status: "error",
        errorMessage: message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const retryWithdraw = async () => {
    if (isRunning) return;
    await runWithdraw();
  };

  const steps: TransactionFlowStep[] = useMemo(
    () => [
      {
        id: "withdraw",
        contractInfo: formatAddress(poolAddress),
        description: `Withdraw ${formatUSDC(remainingCollateral)} USDC remaining collateral`,
        status: stepState.status,
        txHash: stepState.txHash,
        errorMessage: stepState.errorMessage,
        onRetry: retryWithdraw,
      },
    ],
    [poolAddress, remainingCollateral, stepState, isRunning],
  );

  if (!hasRemainingCollateral) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No remaining collateral to withdraw</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground text-center">
        Remaining collateral: {formatUSDC(remainingCollateral)} USDC
      </p>
      <Button
        onClick={runWithdraw}
        disabled={isRunning}
        className="w-full"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Withdraw ${formatUSDC(remainingCollateral)} USDC`
        )}
      </Button>

      <TransactionFlowDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Withdrawing funds..."
        description="This will submit the withdrawal transaction to the completed pool."
        steps={steps}
        isRunning={isRunning}
      />
    </div>
  );
}

