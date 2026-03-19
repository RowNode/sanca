"use client";

import { Button } from "@/components/ui/button";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { SancaPoolAbi } from "@/lib/abis";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface TriggerDrawButtonProps {
  poolAddress: `0x${string}`;
  poolState: "Open" | "Active" | "Completed";
  currentCycle: number;
  cycleStartTime: bigint;
  periodDuration: bigint;
}

export function TriggerDrawButton({
  poolAddress,
  poolState,
  currentCycle,
  cycleStartTime,
  periodDuration,
}: TriggerDrawButtonProps) {
  const { address, isConnected } = useAccount();
  const [canTrigger, setCanTrigger] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Check if draw can be triggered
  const { data: poolInfo, refetch: refetchPoolInfo } = useReadContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "getPoolInfo",
    query: {
      enabled: !!poolAddress && poolState === "Active",
    },
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Helper untuk format countdown
  const formatCountdown = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { days, hours, minutes, seconds: secs };
  };

  // Calculate if draw can be triggered
  useEffect(() => {
    if (!cycleStartTime || !periodDuration) return;

    const checkCanTrigger = () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = Number(cycleStartTime);
      const duration = Number(periodDuration);
      const endTime = startTime + duration;
      const remaining = endTime - now;

      if (remaining <= 0) {
        setCanTrigger(true);
        setTimeRemaining("");
        setCountdown(null);
      } else {
        setCanTrigger(false);
        const endDate = new Date(endTime * 1000);
        setTimeRemaining(formatDistanceToNow(endDate, { addSuffix: true }));
        setCountdown(formatCountdown(remaining));
      }
    };

    checkCanTrigger();
    const interval = setInterval(checkCanTrigger, 1000); // Update every second

    return () => clearInterval(interval);
  }, [cycleStartTime, periodDuration]);

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      toast.success("Draw triggered successfully!");
      refetchPoolInfo();
    }
  }, [isSuccess, refetchPoolInfo]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(`Failed to trigger draw: ${error.message}`);
    }
  }, [error]);

  const handleTriggerDraw = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    writeContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "triggerDraw",
    });
  };

  // Don't show if pool is not active
  if (poolState !== "Active") {
    return null;
  }

  // Don't show if user is not connected
  if (!isConnected) {
    return null;
  }

  const isLoading = isPending || isConfirming;

  return (
    <div className="space-y-2">
      {!canTrigger && countdown && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm font-semibold text-foreground mb-2 text-center">
            Draw available in:
          </p>
          <div className="flex items-center justify-center gap-4">
            {countdown.days > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{countdown.days}</div>
                <div className="text-xs text-muted-foreground">days</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{countdown.hours.toString().padStart(2, '0')}</div>
              <div className="text-xs text-muted-foreground">hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{countdown.minutes.toString().padStart(2, '0')}</div>
              <div className="text-xs text-muted-foreground">minutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{countdown.seconds.toString().padStart(2, '0')}</div>
              <div className="text-xs text-muted-foreground">seconds</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {timeRemaining}
          </p>
        </div>
      )}
      <Button
        onClick={handleTriggerDraw}
        disabled={!canTrigger || isLoading}
        className="w-full"
        size="lg"
        variant={canTrigger ? "default" : "outline"}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isConfirming ? "Confirming..." : "Triggering Draw..."}
          </>
        ) : (
          canTrigger ? "Trigger Draw" : "Waiting for draw time..."
        )}
      </Button>
      {canTrigger && (
        <p className="text-xs text-muted-foreground text-center">
          All members must contribute before triggering draw
        </p>
      )}
    </div>
  );
}

