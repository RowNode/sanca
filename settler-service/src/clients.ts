import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { config, HEDERA_TESTNET, hasExecutionConfig } from "./config.js";

function normalizePrivateKey(value: string): `0x${string}` {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

const account = hasExecutionConfig() ? privateKeyToAccount(normalizePrivateKey(config.privateKey)) : null;

export const publicClient = createPublicClient({
  chain: HEDERA_TESTNET,
  transport: http(config.rpcUrl),
});

export const walletClient = account
  ? createWalletClient({
      account,
      chain: HEDERA_TESTNET,
      transport: http(config.rpcUrl),
    })
  : null;
