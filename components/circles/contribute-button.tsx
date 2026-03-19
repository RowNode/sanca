"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useContribute } from "@/hooks/useContribute";
import { useApproveUSDC } from "@/hooks/useApproveUSDC";
import { useAccount, useReadContract } from "wagmi";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatUSDC } from "@/lib/utils";
import { erc20Abi } from "viem";
import { CONTRACTS } from "@/lib/contracts";
import {
  TransactionFlowDialog,
  type TransactionFlowStep,
  type TransactionStepStatus,
} from "@/components/circles/transaction-flow-dialog";
import { formatAddress } from "@/lib/utils";

interface ContributeButtonProps {
  poolAddress: `0x${string}`;
  poolState: "Open" | "Active" | "Completed";
  currentCycle: number;
  members: Array<{ address: string }>;
  cycleContributions?: Array<{ memberAddress: string; cycleIndex: number }>;
}

export function ContributeButton({
  poolAddress,
  poolState,
  currentCycle,
  members,
  cycleContributions = [],
}: ContributeButtonProps) {
  const { address, isConnected } = useAccount();
  const { contribute, contributionPerPeriod } = useContribute(poolAddress);
  const { approve: approveUSDC } = useApproveUSDC();

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

  // Check if user is a member
  const isUserMember = members.some(
    (member) => member.address.toLowerCase() === address?.toLowerCase()
  );

  // Check if user already contributed to current cycle
  const hasContributed = cycleContributions.some(
    (contrib) =>
      contrib.memberAddress.toLowerCase() === address?.toLowerCase() &&
      contrib.cycleIndex === currentCycle
  );

  const needsApproval =
    allowance !== undefined && contributionPerPeriod !== undefined
      ? allowance < contributionPerPeriod
      : false;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stepState, setStepState] = useState<
    Record<
      "approve" | "contribute",
      {
        status: TransactionStepStatus;
        txHash?: `0x${string}`;
        errorMessage?: string;
      }
    >
  >({
    approve: { status: "queued" },
    contribute: { status: "queued" },
  });

  const resetFlow = () => {
    setStepState({
      approve: {
        status: needsApproval ? "queued" : "skipped",
      },
      contribute: {
        status: "queued",
      },
    });
  };

  const setStep = (
    step: "approve" | "contribute",
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
    if (!needsApproval || !contributionPerPeriod) {
      setStep("approve", { status: "skipped", errorMessage: undefined });
      return true;
    }

    setStep("approve", {
      status: "pending",
      errorMessage: undefined,
      txHash: undefined,
    });

    try {
      const hash = await approveUSDC(poolAddress, contributionPerPeriod);
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

  const runContributionStep = async () => {
    setStep("contribute", {
      status: "pending",
      errorMessage: undefined,
      txHash: undefined,
    });

    try {
      const hash = await contribute();
      setStep("contribute", {
        status: "success",
        txHash: hash,
      });
      toast.success("Contribution successful!");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to contribute";
      setStep("contribute", {
        status: "error",
        errorMessage: message,
      });
      return false;
    }
  };

  const runFlow = async (startFrom: "approve" | "contribute" = "approve") => {
    if (!contributionPerPeriod) {
      toast.error("Unable to determine the contribution amount");
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

      setStep("contribute", {
        status: "queued",
        errorMessage: undefined,
        txHash: undefined,
      });
    }

    await runContributionStep();
    setIsRunning(false);
  };

  const startContributionFlow = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    resetFlow();
    await runFlow("approve");
  };

  const retryApprove = async () => {
    if (isRunning) return;
    setStep("approve", { status: "queued", errorMessage: undefined, txHash: undefined });
    setStep("contribute", {
      status: "queued",
      errorMessage: undefined,
      txHash: undefined,
    });
    await runFlow("approve");
  };

  const retryContribution = async () => {
    if (isRunning) return;
    setStep("contribute", {
      status: "queued",
      errorMessage: undefined,
      txHash: undefined,
    });
    await runFlow("contribute");
  };

  const steps: TransactionFlowStep[] = useMemo(
    () => [
      {
        id: "approve",
        contractInfo: "USDC",
        description: needsApproval
          ? `Grant approval for ${formatUSDC(contributionPerPeriod)} USDC`
          : `Allowance already covers ${formatUSDC(contributionPerPeriod)} USDC`,
        status: stepState.approve.status,
        txHash: stepState.approve.txHash,
        errorMessage: stepState.approve.errorMessage,
        onRetry: retryApprove,
      },
      {
        id: "contribute",
        contractInfo: formatAddress(poolAddress),
        description: `Deposit ${formatUSDC(contributionPerPeriod)} USDC for cycle ${currentCycle + 1}`,
        status: stepState.contribute.status,
        txHash: stepState.contribute.txHash,
        errorMessage: stepState.contribute.errorMessage,
        onRetry: retryContribution,
      },
    ],
    [contributionPerPeriod, currentCycle, needsApproval, poolAddress, stepState],
  );

  // Don't show if pool is not active
  if (poolState !== "Active") {
    return null;
  }

  // Don't show if user is not a member
  if (!isUserMember) {
    return null;
  }

  // Show success message if already contributed
  if (hasContributed) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 text-accent" />
        <span>You have already contributed to this cycle</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={startContributionFlow}
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
          `Contribute ${formatUSDC(contributionPerPeriod || BigInt(0))} USDC`
        )}
      </Button>
      {needsApproval && !isRunning && (
        <p className="text-xs text-muted-foreground text-center">
          This will request approval first, then submit your contribution
        </p>
      )}

      <TransactionFlowDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Submitting contribution..."
        description="This flow may include a USDC approval and then the contribution transaction."
        steps={steps}
        isRunning={isRunning}
      />
    </div>
  );
}

