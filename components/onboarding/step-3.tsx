export default function OnboardingStep3() {
  const responsibilities = [
    {
      title: "Deposit Full Collateral Upfront",
      description: "When you join a pool, you commit the full value of all periods in one upfront USDC deposit.",
      commitment: "Required",
    },
    {
      title: "Contribute On Time",
      description:
        "Each period you still need to send your USDC contribution. If you don't, part of your collateral can be liquidated.",
      commitment: "Required",
    },
    {
      title: "Keep Your Wallet Secure",
      description:
        "All assets and transactions live in your own wallet. Keep your private key / seed phrase and dApp connections safe.",
      commitment: "Important",
    },
  ]

  const rules = [
    "Once you join a pool, you can't opt out midway until all cycles are completed.",
    "If you miss a period contribution, the contract can liquidate part of your collateral to cover it.",
    "Winners are selected from a pre-shuffled schedule generated with Hedera PRNG at pool start; each member wins exactly once.",
    "Collateral stays in the pool until all periods are finished, then can be withdrawn back as USDC.",
    "New members can only join while the pool is still 'Open' and not yet full.",
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Your Role in a Sanca Pool</h1>
        <p className="text-lg text-muted-foreground">Understand what&apos;s expected from you as a pool member</p>
      </div>

      <div className="space-y-4 pt-6">
        <div>
          <h3 className="font-semibold text-foreground mb-4">Your Responsibilities</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {responsibilities.map((resp, idx) => (
              <div key={idx} className="bg-background rounded-lg p-4 border border-border">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground text-sm">{resp.title}</h4>
                  <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded">
                    {resp.commitment}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{resp.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-4">Circle Rules & Fairness</h3>
          <ul className="space-y-3">
            {rules.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-accent font-bold mt-1">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}