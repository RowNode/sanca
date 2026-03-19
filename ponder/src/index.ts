import { ponder } from "ponder:registry";
import { cycles, members, pools, cycleContributions } from "ponder:schema";

// Index pools from SancaFactory
ponder.on("SancaFactory:PoolCreated", async ({ event, context }) => {
  const { db } = context;
  const {
    pool,
    creator,
    maxMembers,
    contributionPerPeriod,
    periodDuration,
    yieldBonusSplit,
    poolName,
    poolDescription,
  } = event.args;

  await db.insert(pools).values({
    id: pool.toLowerCase(),
    creator: creator.toLowerCase(),
    name: poolName,
    description: poolDescription || "", // Handle empty description
    maxMembers: Number(maxMembers),
    contributionPerPeriod,
    periodDuration,
    yieldBonusSplit: Number(yieldBonusSplit),
    state: "Open",
    currentCycle: 0,
    totalCycles: Number(maxMembers),
    cycleStartTime: 0n,
    createdAtBlock: event.block.number,
    createdAtTimestamp: event.block.timestamp,
  });
});

// Index members joining a pool (any SancaPool clone)
ponder.on("SancaPool:Joined", async ({ event, context }) => {
  const { db } = context;
  const { member, contribution } = event.args;
  const poolAddress = event.log.address;

  await db.insert(members).values({
    id: `${poolAddress.toLowerCase()}-${member.toLowerCase()}`,
    poolId: poolAddress.toLowerCase(),
    address: member.toLowerCase(),
    contribution,
    joinedAtBlock: event.block.number,
    joinedAtTimestamp: event.block.timestamp,
  });
});

// Index cycle winners & yield distribution (any SancaPool clone)
ponder.on(
  "SancaPool:WinnerSelected",
  async ({ event, context }) => {
    const { db } = context;
    const { cycle, winner, prize } = event.args;
    const poolAddress = event.log.address;

    await db.insert(cycles).values({
      id: `${poolAddress.toLowerCase()}-${cycle.toString()}`,
      poolId: poolAddress.toLowerCase(),
      index: Number(cycle),
      winner: winner.toLowerCase(),
      prize,
      // Filled from YieldDistributed if that event is also seen; for now
      // we mirror prize into yield-related fields to keep schema simple.
      yieldBonus: 0n,
      compounded: 0n,
      createdAtTimestamp: event.block.timestamp,
    });
  },
);

// Pool lifecycle events to keep pool state in sync (any SancaPool clone)
ponder.on(
  "SancaPool:PoolStarted",
  async ({ event, context }) => {
    const { db } = context;
    const { startTime, totalCycles } = event.args;
    const poolAddress = event.log.address.toLowerCase();

    // Update pool state using correct Ponder syntax
    await db
      .update(pools, { id: poolAddress })
      .set({
        state: "Active",
        currentCycle: 0,
        totalCycles: Number(totalCycles),
        cycleStartTime: startTime,
      });
  },
);

ponder.on(
  "SancaPool:CycleEnded",
  async ({ event, context }) => {
    const { db } = context;
    const { cycle } = event.args;
    const poolAddress = event.log.address.toLowerCase();

    // When settleCycle() succeeds, contract does:
    // - emit CycleEnded(previousCycle)
    // - if still Active, sets currentCycle++ and cycleStartTime = block.timestamp
    //
    // So for indexer we treat:
    // - new currentCycle = cycle + 1
    // - new cycleStartTime = block timestamp of this event
    const nextCycle = Number(cycle) + 1;

    await db
      .update(pools, { id: poolAddress })
      .set({
        currentCycle: nextCycle,
        cycleStartTime: event.block.timestamp,
      });
  },
);

ponder.on(
  "SancaPool:PoolCompleted",
  async ({ event, context }) => {
    const { db } = context;
    const poolAddress = event.log.address.toLowerCase();

    // Update pool state using correct Ponder syntax
    await db
      .update(pools, { id: poolAddress })
      .set({
        state: "Completed",
      });
  },
);

ponder.on(
  "SancaPool:YieldDistributed",
  async ({ event, context }) => {
    const { db } = context;
    const { cycle, winner, yieldBonus, compounded } = event.args;
    const poolAddress = event.log.address;

    const cycleId = `${poolAddress.toLowerCase()}-${cycle.toString()}`;
    
    // Update cycle with yield info (cycle should already exist from WinnerSelected)
    await db
      .update(cycles, { id: cycleId })
      .set({
        yieldBonus,
        compounded,
        prize: yieldBonus + compounded,
      });
  },
);

// Index contributions per cycle
ponder.on("SancaPool:Contributed", async ({ event, context }) => {
  const { db } = context;
  const { cycle, member, amount } = event.args;
  const poolAddress = event.log.address;

  await db.insert(cycleContributions).values({
    id: `${poolAddress.toLowerCase()}-${cycle.toString()}-${member.toLowerCase()}`,
    poolId: poolAddress.toLowerCase(),
    cycleIndex: Number(cycle),
    memberAddress: member.toLowerCase(),
    amount,
    isLiquidated: false,
    createdAtTimestamp: event.block.timestamp,
  });
});

// Index liquidated contributions
ponder.on("SancaPool:CollateralLiquidated", async ({ event, context }) => {
  const { db } = context;
  const { cycle, member, amount } = event.args;
  const poolAddress = event.log.address;

  await db.insert(cycleContributions).values({
    id: `${poolAddress.toLowerCase()}-${cycle.toString()}-${member.toLowerCase()}`,
    poolId: poolAddress.toLowerCase(),
    cycleIndex: Number(cycle),
    memberAddress: member.toLowerCase(),
    amount,
    isLiquidated: true,
    createdAtTimestamp: event.block.timestamp,
  });
});

