"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { useAccount } from "wagmi";
import DashboardStats from "@/components/dashboard/stats";
import ActiveCirclesSection from "@/components/dashboard/active-circles";
import CreatedCirclesSection from "@/components/dashboard/created-circles";
import UpcomingPayouts from "@/components/dashboard/upcoming-payouts";
import AlertsSection from "@/components/dashboard/alerts";
import { CreateCircleDialog } from "@/components/circles/create-circle-dialog";
import { usePools, useUserPools } from "@/hooks/usePools";
import ConnectWalletButton from "@/components/wallet/connect-wallet-button";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: userPools } = useUserPools();
  const { data: allPools } = usePools();

  const createdPools =
    address && allPools
      ? allPools.filter((pool) => pool.creator.toLowerCase() === address.toLowerCase())
      : [];

  const hasPools = (userPools && userPools.length > 0) || createdPools.length > 0;

  useEffect(() => {
    console.log("userPools", userPools);
  }, [userPools]);
  
  if (!isConnected) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto min-h-screen">
          <div className="bg-linear-to-br from-card to-card border border-border rounded-lg p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">Please connect your wallet to access this page</p>
                {/* <p className="text-muted-foreground">
                  We’ll load your on-chain stats and activity for the connected address.
                </p> */}
              </div>

              <div className="pt-1">
                <ConnectWalletButton />
              </div>

              <p className="text-xs text-muted-foreground max-w-md">
                If you’re on the wrong network, you can switch from the wallet button after connecting.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-8 max-w-6xl mx-auto min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Welcome back
              {address ? `, ${address.slice(0, 6)}...${address.slice(-4)}` : ""}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your circles, contributions, and payouts
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="w-5 h-5" />
            Create Circle
          </Button>
        </div>

        {/* Stats Overview */}
        <DashboardStats />

        {/* Alerts & Reminders */}
        <AlertsSection />

        {/* Circles Content */}
        {hasPools ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-8">
              <ActiveCirclesSection />

              {/* Circles You Created */}
              <CreatedCirclesSection />
            </div>

            {/* Upcoming Payouts Sidebar */}
            <div>
              <UpcomingPayouts />
            </div>
          </div>
        ) : (
          <div className="border-t border-border pt-8">
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <div className="space-y-4 max-w-md mx-auto">
                <Users className="w-12 h-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">
                  No Circles Yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create your first circle or join an existing one to start saving
                  with your community
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button
                    className="gap-2"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Create Circle
                  </Button>
                  <Link href="/circles">
                    <Button variant="outline">Browse Circles</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <CreateCircleDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    </div>
  );
}
