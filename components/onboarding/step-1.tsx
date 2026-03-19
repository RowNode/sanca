export default function OnboardingStep1() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Welcome to Sanca</h1>
        <p className="text-lg text-muted-foreground">
          An on-chain rotating savings pool ( ROSCA ) with transparent rules and yield-bearing collateral.
        </p>
      </div>

      <div className="space-y-4 pt-6">
        <div className="bg-background rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-2">What is Sanca?</h3>
          <p className="text-sm text-muted-foreground">
            Sanca is an on-chain ROSCA (Rotating Savings and Credit Association) built on Hedera. Each
            member deposits their full collateral in USDC upfront. Every period, one member is randomly selected to receive the period&apos;s pot while their
            collateral stays locked.
          </p>
        </div>

        <div className="bg-background rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-2">Why Sanca?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">✓</span>
              <span>All pool rules are enforced by smart contracts and verifiable on-chain at any time.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">✓</span>
              <span>
                Collateral is held by the pool smart contract and earns yield while the pool runs.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">✓</span>
              <span>
                Winners are selected using Hedera&apos;s on-chain PRNG, and the winner schedule is pre-shuffled once at
                pool start, making the draw order fair and predictable (each member wins exactly once).
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-background rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-2">What&apos;s next?</h3>
          <p className="text-sm text-muted-foreground">
            In the next steps you&apos;ll see how a Sanca pool works, what your responsibilities are as a member, how
            funds and yield are distributed, and finally you can either join an existing pool or create your own.
          </p>
        </div>
      </div>
    </div>
  )
}
