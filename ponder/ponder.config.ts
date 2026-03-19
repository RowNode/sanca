import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { SancaFactoryAbi } from "./abis/SancaFactoryAbi";
import { SancaPoolAbi } from "./abis/SancaPoolAbi";

export default createConfig({
  chains: {
    HederaTestnet: {
      id: 296,
      rpc: process.env.PONDER_RPC_URL_296!,
      ethGetLogsBlockRange: 100,
    },
  },
  contracts: {
    SancaFactory: {
      chain: "HederaTestnet",
      abi: SancaFactoryAbi,
      address: "0x08a74CB8D0B398d9d6add0992085E488321Ef686",
      // Deployment block from latest deploy
      startBlock: 32826044,
    },
    // All SancaPool clones created by the factory (dynamic source)
    SancaPool: {
      chain: "HederaTestnet",
      abi: SancaPoolAbi,
      address: factory({
        address: "0x08a74CB8D0B398d9d6add0992085E488321Ef686",
        event: parseAbiItem(
          "event PoolCreated(address indexed pool, address indexed creator, uint8 maxMembers, uint256 contributionPerPeriod, uint256 periodDuration, uint8 yieldBonusSplit, string poolName, string poolDescription)",
        ),
        parameter: "pool",
      }),
      startBlock: 32826044,
    },
  },
});

