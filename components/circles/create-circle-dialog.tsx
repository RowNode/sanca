"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NumericFormat } from "react-number-format";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useCreatePool } from "@/hooks/useCreatePool";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateCircleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCircleDialog({
  open,
  onOpenChange,
}: CreateCircleDialogProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createPool, isPending, isConfirming, isSuccess, error, hash } =
    useCreatePool();

  const [formData, setFormData] = useState({
    circleName: "",
    description: "",
    contribution: "",
    cycleDuration: "30", // Default 30 days
    memberCount: "5",
    yieldBonusSplit: "20", // Default 20%
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle success - redirect to new pool
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success("Pool created successfully!");
      onOpenChange(false);
      // Reset form
      setFormData({
        circleName: "",
        description: "",
        contribution: "",
        cycleDuration: "30", // Default 30 days
        memberCount: "5",
        yieldBonusSplit: "20",
      });
      // Give the app data routes a moment to reflect the new pool before redirecting
      setTimeout(() => {
        // We'll need to get the pool address from the transaction receipt
        // For now, just redirect to circles page
        router.push("/circles");
      }, 2000);
    }
  }, [isSuccess, hash, router, onOpenChange]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(`Failed to create pool: ${error.message}`);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!formData.circleName || !formData.contribution) {
      toast.error("Please fill in all required fields");
      return;
    }

    const contribution = parseFloat(formData.contribution);
    if (isNaN(contribution) || contribution <= 0) {
      toast.error("Please enter a valid contribution amount");
      return;
    }

    const maxMembers = parseInt(formData.memberCount);
    
    // Validate maxMembers (contract requires > 1)
    if (isNaN(maxMembers) || maxMembers < 2) {
      toast.error("Number of members must be at least 2");
      return;
    }
    
    // Parse days directly (already in days)
    const periodDurationInDays = parseInt(formData.cycleDuration);
    const yieldBonusSplit = parseInt(formData.yieldBonusSplit);
    
    if (isNaN(periodDurationInDays) || periodDurationInDays < 1 || periodDurationInDays > 365) {
      toast.error("Cycle duration must be between 1 and 365 days");
      return;
    }
    
    if (isNaN(yieldBonusSplit) || yieldBonusSplit < 0 || yieldBonusSplit > 100) {
      toast.error("Yield bonus split must be between 0 and 100");
      return;
    }

    try {
      await createPool({
        maxMembers,
        contributionPerPeriod: contribution,
        periodDuration: periodDurationInDays,
        yieldBonusSplit,
        poolName: formData.circleName,
        poolDescription: formData.description || "", // Allow empty description
      });

      toast.info("Transaction submitted. Waiting for confirmation...");
    } catch (err: any) {
      toast.error(`Failed to create pool: ${err.message || "Unknown error"}`);
    }
  };

  const isLoading = isPending || isConfirming;

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form on cancel
    setFormData({
      circleName: "",
      description: "",
      contribution: "",
      cycleDuration: "30", // Default 30 days
      memberCount: "5",
      yieldBonusSplit: "20",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Circle</DialogTitle>
          <DialogDescription>
            Set up a rotating savings group with your community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Circle Name */}
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-foreground">
              Circle Name
            </Label>
            <Input
              type="text"
              name="circleName"
              placeholder="e.g., Community Builders, Tech Savings..."
              value={formData.circleName}
              onChange={handleChange}
              required
              className="bg-background border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Choose a memorable name for your circle
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-foreground">
              Description
            </Label>
            <Textarea
              name="description"
              placeholder="Describe your circle's purpose and goals..."
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-background border border-border px-3 py-2 text-foreground placeholder-muted-foreground text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Add details about your circle's purpose
            </p>
          </div>


          {/* Contribution Amount */}
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-foreground">
              Monthly Contribution
            </Label>
            <NumericFormat
              id="contribution"
              className="bg-background border-border text-foreground"
              customInput={Input}
              value={formData.contribution}
              thousandSeparator="."
              decimalSeparator=","
              prefix="$ "
              allowNegative={false}
              onValueChange={(values) => {
                const { floatValue } = values;
                setFormData({
                  ...formData,
                  contribution: floatValue ? floatValue.toString() : "",
                });
              }}
              placeholder="$ 0"
              required
            />
            <p className="text-xs text-muted-foreground">
              Amount each member contributes per month
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Cycle Duration */}
            <div className="space-y-2">
              <Label className="block text-sm font-semibold text-foreground">
                Duration Per Cycle (days)
              </Label>
              <NumericFormat
                id="cycleDuration"
                className="bg-background border-border text-foreground"
                customInput={Input}
                value={formData.cycleDuration}
                allowNegative={false}
                decimalScale={0}
                isAllowed={(values) => {
                  const { floatValue } = values;
                  return floatValue === undefined || (floatValue >= 1 && floatValue <= 365);
                }}
                onValueChange={(values) => {
                  const { floatValue } = values;
                  setFormData({
                    ...formData,
                    cycleDuration: floatValue ? floatValue.toString() : "",
                  });
                }}
                placeholder="30"
                required
              />
              <p className="text-xs text-muted-foreground">
                Each cycle lasts this duration (1-365 days). Total pool duration = {formData.cycleDuration || "0"} days × {formData.memberCount || "0"} cycles = {Number(formData.cycleDuration || 0) * Number(formData.memberCount || 0)} days
              </p>
            </div>

            {/* Member Count */}
            <div className="space-y-2">
              <Label className="block text-sm font-semibold text-foreground">
                Number of Members
              </Label>
              <Select
                value={formData.memberCount}
                onValueChange={(value) =>
                  setFormData({ ...formData, memberCount: value })
                }
              >
                <SelectTrigger className="w-full bg-background border border-border text-foreground">
                  <SelectValue placeholder="Select a number of members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 members</SelectItem>
                  <SelectItem value="3">3 members</SelectItem>
                  <SelectItem value="4">4 members</SelectItem>
                  <SelectItem value="5">5 members</SelectItem>
                  <SelectItem value="6">6 members</SelectItem>
                  <SelectItem value="8">8 members</SelectItem>
                  <SelectItem value="10">10 members</SelectItem>
                  <SelectItem value="12">12 members</SelectItem>
                  <SelectItem value="15">15 members</SelectItem>
                  <SelectItem value="20">20 members</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Minimum 2 members required
              </p>
            </div>
          </div>

          {/* Yield Bonus Split */}
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-foreground">
              Yield Bonus Split (%)
            </Label>
            <NumericFormat
              id="yieldBonusSplit"
              className="bg-background border-border text-foreground"
              customInput={Input}
              value={formData.yieldBonusSplit}
              allowNegative={false}
              suffix=" %"
              onValueChange={(values) => {
                const { floatValue } = values;
                setFormData({
                  ...formData,
                  yieldBonusSplit: floatValue ? floatValue.toString() : "0",
                });
              }}
              isAllowed={(values) => {
                const { floatValue } = values;
                return floatValue === undefined || (floatValue >= 0 && floatValue <= 100);
              }}
              placeholder="20 %"
              required
            />
            <p className="text-xs text-muted-foreground">
              Percentage of yield that goes to the winner each cycle (0-100%). Rest is compounded for all members.
            </p>
          </div>

          {/* Summary */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-3">
              Circle Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  Monthly Contribution:
                </span>
                <span className="font-mono font-bold text-foreground">
                  ${formData.contribution || "0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Members:</span>
                <span className="font-semibold text-foreground">
                  {formData.memberCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Fund Size:</span>
                <span className="font-mono font-bold text-accent">
                  $
                  {(
                    (Number.parseInt(formData.contribution) || 0) *
                    Number.parseInt(formData.memberCount)
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Duration Per Cycle:</span>
                <span className="font-semibold text-foreground">
                  {formData.cycleDuration} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Pool Duration:</span>
                <span className="font-semibold text-foreground">
                  {Number(formData.cycleDuration || 0) * Number(formData.memberCount || 0)} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Yield Bonus Split:</span>
                <span className="font-semibold text-foreground">
                  {formData.yieldBonusSplit}%
                </span>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <DialogFooter className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="bg-transparent w-full"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isConnected} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isConfirming ? "Confirming..." : "Creating..."}
                </>
              ) : (
                "Create Circle"
              )}
            </Button>
          </DialogFooter>
          {!isConnected && (
            <p className="text-xs text-muted-foreground text-center">
              Please connect your wallet to create a circle
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
