"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export default function OnboardingStep5({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <div className="mb-4 flex items-center justify-center">
          <Sparkles className="size-12" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">You&apos;re Ready</h1>
        <p className="text-lg text-muted-foreground">You now understand how Sanca on‑chain pools work end‑to‑end.</p>
      </div>

      <div className="bg-background rounded-lg p-8 border border-border space-y-4 mt-8">
        <h3 className="font-semibold text-foreground">What&apos;s Next?</h3>
        <div className="space-y-3 text-sm text-muted-foreground text-left">
          <div className="flex gap-3">
            <span className="text-accent font-bold">1</span>
            <span>Connect your wallet to Hedera Testnet and make sure you have a small amount of HBAR for gas.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">2</span>
            <span>
              Browse existing pools or create a new one, then review the details (member cap, contribution size,
              period duration, and yield bonus split).
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">3</span>
            <span>
              Approve USDC and join a pool to deposit your full collateral, then use the dashboard to track
              contributions, draw results (via Hedera PRNG winner schedule), payouts, and your remaining collateral over
              time.
            </span>
          </div>
        </div>
      </div>

      <div className="pt-8">
        <Button onClick={onComplete} size="lg" className="gap-2 px-8">
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}