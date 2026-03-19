"use client";

import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatAddress } from "@/lib/utils";

export type TransactionStepStatus =
  | "queued"
  | "pending"
  | "success"
  | "error"
  | "skipped";

export interface TransactionFlowStep {
  id: string;
  contractInfo: string;
  description: string;
  status: TransactionStepStatus;
  txHash?: `0x${string}` | string;
  errorMessage?: string;
  onRetry?: () => void;
}

interface TransactionFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  steps: TransactionFlowStep[];
  isRunning?: boolean;
}

function getStatusLabel(status: TransactionStepStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "success":
      return "Success";
    case "error":
      return "Failed";
    case "skipped":
      return "Skipped";
    default:
      return "Queued";
  }
}

function StatusBadge({ status }: { status: TransactionStepStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-blue-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {getStatusLabel(status)}
      </span>
    );
  }

  if (status === "success" || status === "skipped") {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        {getStatusLabel(status)}
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        {getStatusLabel(status)}
      </span>
    );
  }

  return <span className="text-sm text-muted-foreground">{getStatusLabel(status)}</span>;
}

export function TransactionFlowDialog({
  open,
  onOpenChange,
  title,
  description,
  steps,
  isRunning = false,
}: TransactionFlowDialogProps) {
  const hasError = steps.some((step) => step.status === "error");
  const isFinished =
    steps.every((step) => ["success", "skipped"].includes(step.status)) &&
    steps.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background/95 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)_auto_auto] gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>Contract</span>
            <span>Description</span>
            <span>Status</span>
            <span className="text-right">Retry</span>
          </div>

          <div className="divide-y divide-border">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "grid grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)_auto_auto] gap-4 px-4 py-4",
                  step.status === "error" && "bg-destructive/5",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{step.contractInfo}</p>
                  {step.txHash ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatAddress(step.txHash)}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="text-sm text-foreground">{step.description}</p>
                  {step.errorMessage ? (
                    <p className="mt-1 text-xs text-destructive">{step.errorMessage}</p>
                  ) : null}
                </div>

                <div className="flex items-center">
                  <StatusBadge status={step.status} />
                </div>

                <div className="flex items-center justify-end">
                  {step.status === "error" && step.onRetry ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={step.onRetry}
                      disabled={isRunning}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="sr-only">Retry step</span>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {step.status === "pending" ? "Running" : "-"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="items-center justify-between sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {isRunning
              ? "Confirm the transaction in your wallet when prompted."
              : hasError
                ? "Retry the failed step to continue the flow."
                : isFinished
                  ? "All transaction steps completed."
                  : "Transaction flow is ready."}
          </p>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {isFinished ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
