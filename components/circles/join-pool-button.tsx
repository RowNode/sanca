"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useJoinPool } from "@/hooks/useJoinPool";
import { useApproveUSDC } from "@/hooks/useApproveUSDC";
import { useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { CONTRACTS } from "@/lib/contracts";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { formatUnits } from "viem";
import {
  TransactionFlowDialog,
  type TransactionFlowStep,
  type TransactionStepStatus,
} from "@/components/circles/transaction-flow-dialog";
import { formatAddress } from "@/lib/utils";

interface JoinPoolButtonProps {
  poolAddress: `0x${string}`;
  poolState: "Open" | "Active" | "Completed";
  currentMembers: number;
  maxMembers: number;
  members?: Array<{ address: string }>; // List of member addresses
}

export function JoinPoolButton({
  poolAddress,
  poolState,
  currentMembers,
  maxMembers,
  members = [],
}: JoinPoolButtonProps) {
  const { address, isConnected } = useAccount();

  // Check if user is already a member
  const isUserMember = address && members.some(
    (m) => m.address.toLowerCase() === address.toLowerCase()
  );
  const { join, fullCollateral } = useJoinPool(poolAddress);
  const { approve } = useApproveUSDC();

  // Check current USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && poolAddress ? [address, poolAddress] : undefined,
    query: {
      enabled: !!address && !!poolAddress,
    },
  });

  const needsApproval = fullCollateral !== undefined && allowance !== undefined
    ? allowance < fullCollateral
    : false;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stepState, setStepState] = useState<
    Record<
      "approve" | "join",
      {
        status: TransactionStepStatus;
        txHash?: `0x${string}`;
        errorMessage?: string;
      }
    >
  >({
    approve: { status: "queued" },
    join: { status: "queued" },
  });

  const requiredAmountLabel = fullCollateral
    ? formatUnits(fullCollateral, 6)
    : null;

  const resetFlow = () => {
    setStepState({
      approve: {
        status: needsApproval ? "queued" : "skipped",
      },
      join: {
        status: "queued",
      },
    });
  };

  const setStep = (
    step: "approve" | "join",
    patch: Partial<(typeof stepState)["approve"]>,
  ) => {
    setStepState((current) => ({
      ...current,
      [step]: {
        ...current[step],
        ...patch,
      },
    }));
  };

  const runApproveStep = async () => {
    if (!fullCollateral || !needsApproval) {
      setStep("approve", { status: "skipped", errorMessage: undefined });
      return true;
    }

    setStep("approve", {
      status: "pending",
      errorMessage: undefined,
      txHash: undefined,
    });

    try {
      const hash = await approve(poolAddress, fullCollateral);
      await refetchAllowance();
      setStep("approve", {
        status: "success",
        txHash: hash,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to approve USDC";
      setStep("approve", {
        status: "error",
        errorMessage: message,
      });
      return false;
    }
  };

  const runJoinStep = async () => {
    setStep("join", {
      status: "pending",
      errorMessage: undefined,
      txHash: undefined,
    });

    try {
      const hash = await join();
      setStep("join", {
        status: "success",
        txHash: hash,
      });
      toast.success("Successfully joined the pool!");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join pool";
      setStep("join", {
        status: "error",
        errorMessage: message,
      });
      return false;
    }
  };

  const runFlow = async (startFrom: "approve" | "join" = "approve") => {
    if (!fullCollateral) {
      toast.error("Unable to determine the required collateral yet");
      return;
    }

    setIsDialogOpen(true);
    setIsRunning(true);

    if (startFrom === "approve") {
      const approved = await runApproveStep();
      if (!approved) {
        setIsRunning(false);
        return;
      }

      setStep("join", {
        status: "queued",
        errorMessage: undefined,
        txHash: undefined,
      });
    }

    await runJoinStep();
    setIsRunning(false);
  };

  const startJoinFlow = async () => {
    resetFlow();
    await runFlow("approve");
  };

  const retryApprove = async () => {
    if (isRunning) return;
    setStep("approve", { status: "queued", errorMessage: undefined, txHash: undefined });
    setStep("join", { status: "queued", errorMessage: undefined, txHash: undefined });
    await runFlow("approve");
  };

  const retryJoin = async () => {
    if (isRunning) return;
    setStep("join", { status: "queued", errorMessage: undefined, txHash: undefined });
    await runFlow("join");
  };

  const steps: TransactionFlowStep[] = useMemo(
    () => [
      {
        id: "approve",
        contractInfo: "USDC",
        description: fullCollateral
          ? needsApproval
            ? `Grant approval for ${formatUnits(fullCollateral, 6)} USDC`
            : `Allowance already covers ${formatUnits(fullCollateral, 6)} USDC`
          : "Prepare USDC approval",
        status: stepState.approve.status,
        txHash: stepState.approve.txHash,
        errorMessage: stepState.approve.errorMessage,
        onRetry: retryApprove,
      },
      {
        id: "join",
        contractInfo: formatAddress(poolAddress),
        description: fullCollateral
          ? `Deposit ${formatUnits(fullCollateral, 6)} USDC collateral and join this pool`
          : "Join the selected pool",
        status: stepState.join.status,
        txHash: stepState.join.txHash,
        errorMessage: stepState.join.errorMessage,
        onRetry: retryJoin,
      },
    ],
    [fullCollateral, needsApproval, poolAddress, stepState],
  );

  // Don't show button if pool is not open or already full
  if (poolState !== "Open" || currentMembers >= maxMembers) {
    return null;
  }

  // Don't show if user is already a member
  if (isUserMember) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">You are already a member of this pool</p>
      </div>
    );
  }

  // Don't show if user is not connected
  if (!isConnected) {
    return (
      <Button disabled className="w-full">
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet to Join
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {requiredAmountLabel && (
        <p className="text-sm text-muted-foreground text-center">
          Required: {requiredAmountLabel} USDC
        </p>
      )}

      <Button
        onClick={startJoinFlow}
        disabled={isRunning || !fullCollateral}
        className="w-full"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Join Pool"
        )}
      </Button>

      <TransactionFlowDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Joining pool..."
        description="This flow may include a USDC approval and then the pool join transaction."
        steps={steps}
        isRunning={isRunning}
      />
    </div>
  );
}

