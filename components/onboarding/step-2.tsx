import { ChartColumnBig, Check, DollarSign, Lightbulb, RefreshCw } from "lucide-react";

export default function OnboardingStep2() {
  const phases = [
    {
      title: "Deposit Full Collateral",
      description: "When you join a pool, you deposit the total value of all your future contributions upfront in USDC.",
      icon: ChartColumnBig,
    },
    {
      title: "Collateral Held by Pool",
      description: "That USDC is held by the pool smart contract, earning yield while the pool runs.",
      icon: DollarSign,
    },
    {
      title: "Per-Period Contribution",
      description: "Each period, every member sends a fresh USDC contribution that funds that period&apos;s payout.",
      icon: RefreshCw,
    },
    {
      title: "Random Draw & Payout",
      description:
        "Hedera PRNG pre-shuffles the winner schedule at pool start; each period, the next address in the schedule receives the pot plus a share of the accrued yield.",
      icon: Check,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          How a Sanca Pool Works
        </h1>
        <p className="text-lg text-muted-foreground">
          High-level flow: Collateral → Period Contributions → Draw → Payout
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          return (
            <div
              key={idx}
              className="bg-background rounded-lg p-6 border border-border"
            >
              <div className="mb-3">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {phase.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {phase.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-accent/10 border border-accent/30 rounded-lg p-6 mt-8">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <span className="text-accent">
            <Lightbulb className="size-7" />
          </span>
          Example: 5-Member Pool
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Members: 5</p>
          <p>• Contribution per period: 50 USDC per member</p>
          <p>• Upfront collateral per member: 50 USDC × 5 periods = 250 USDC</p>
          <p>• Period pot: 50 USDC × 5 = 250 USDC (paid out to one winner each period)</p>
          <p>• Each period, 1 member receives 250 USDC + a bonus portion of the yield.</p>
          <p>• After all 5 periods are completed, members can withdraw their remaining collateral plus their share of the compounded yield.</p>
        </div>
      </div>
    </div>
  );
}