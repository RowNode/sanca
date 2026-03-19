export default function OnboardingStep4() {
  const demoCircle = {
    name: "Sanca Pool Example",
    members: 6,
    contribution: "50 USDC",
    duration: "6 months",
    fundSize: "300 USDC",
  }

  const demoTimeline = [
    { month: "Month 1", member: "Sarah", status: "completed" },
    { month: "Month 2", member: "Mike", status: "completed" },
    { month: "Month 3", member: "YOU", status: "current" },
    { month: "Month 4", member: "Priya", status: "upcoming" },
    { month: "Month 5", member: "James", status: "upcoming" },
    { month: "Month 6", member: "Lisa", status: "upcoming" },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">See a Sanca Pool in Action</h1>
        <p className="text-lg text-muted-foreground">
          A simple example of how a pool runs and when you can expect your payout.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
        {/* Circle Info */}
        <div className="bg-background rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-4">{demoCircle.name}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Total Members</span>
              <span className="font-semibold text-foreground">{demoCircle.members}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Contribution per Period</span>
              <span className="font-semibold text-foreground font-mono">{demoCircle.contribution}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Period Duration</span>
              <span className="font-semibold text-foreground">{demoCircle.duration}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Total Pot per Period</span>
              <span className="font-semibold text-foreground font-mono text-accent text-lg">{demoCircle.fundSize}</span>
            </div>
          </div>
        </div>

        {/* Payout Timeline */}
        <div className="bg-background rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-4">Payout Schedule</h3>
          <div className="space-y-2">
            {demoTimeline.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded bg-card/50">
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.status === "completed"
                      ? "bg-accent"
                      : item.status === "current"
                        ? "bg-accent animate-pulse"
                        : "bg-border"
                  }`}
                ></div>
                <span className="text-xs font-mono font-medium text-muted-foreground flex-1">{item.month}</span>
                <span
                  className={`text-xs font-semibold ${
                    item.status === "current" ? "text-accent bg-accent/10 px-2 py-1 rounded" : "text-foreground"
                  }`}
                >
                  {item.member}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-2">Your Position: Payout in Period 3</h3>
        <p className="text-sm text-muted-foreground">
          In this example, you would receive a 300 USDC payout in period 3. That means you deposited your full
          collateral at the start, contributed for 2 periods before your payout, and continue contributing through
          period 6 to complete the pool.           Throughout the whole lifecycle, your collateral earns yield that is
          partially paid out each draw and partially compounded for everyone.
        </p>
      </div>
    </div>
  )
}