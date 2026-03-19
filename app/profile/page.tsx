"use client"

import { Button } from "@/components/ui/button"
import { Copy, ExternalLink } from "lucide-react"
import { useState } from "react"
import { useAccount } from "wagmi"
import WalletStats from "@/components/wallet/wallet-stats"
import TransactionHistory from "@/components/wallet/transaction-history"
import { useUserStats } from "@/hooks/useUserStats"
import { Loader2 } from "lucide-react"
import ConnectWalletButton from "@/components/wallet/connect-wallet-button"

export default function ProfilePage() {
  const [copied, setCopied] = useState(false)
  const { address, isConnected } = useAccount()
  const { data: stats, isLoading: statsLoading } = useUserStats()

  const walletAddress = address || ""

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Get explorer URL based on chain (Hedera Testnet / Mainnet)
  const getExplorerUrl = (address: string) => {
    // Default to Hedera Testnet (HashScan)
    return `https://hashscan.io/testnet/address/${address}`;
  };

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
        <div>
          <h1 className="text-4xl font-bold text-foreground">Wallet & Account</h1>
          <p className="text-muted-foreground mt-2">View your wallet details and transaction history</p>
        </div>

        {/* Wallet Card */}
        <div className="bg-linear-to-br from-card to-card border border-border rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Wallet Address</p>
              <div className="flex items-center gap-3">
                <code className="font-mono text-sm font-semibold text-foreground bg-background rounded px-3 py-2 flex-1 overflow-x-auto">
                  {walletAddress}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="shrink-0 bg-transparent"
                  disabled={!walletAddress}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2 bg-transparent"
                  asChild
                  disabled={!walletAddress}
                >
                  <a href={getExplorerUrl(walletAddress)} target="_blank" rel="noopener noreferrer">
                    View
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Contributed</p>
                  <p className="text-2xl font-bold text-foreground font-mono">
                    ${stats?.totalContributed.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Received</p>
                  <p className="text-2xl font-bold text-accent font-mono">
                    ${stats?.totalReceived.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Pending Payouts</p>
                  <p className="text-2xl font-bold text-foreground font-mono">
                    ${stats?.pendingPayouts.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Pools</p>
                  <p className="text-2xl font-bold text-foreground font-mono">
                    {stats?.totalPools || 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wallet Stats */}
        <WalletStats />

        {/* Transaction History */}
        <TransactionHistory />
      </div>
    </div>
  )
}
