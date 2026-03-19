import { Client, PrivateKey } from "@hashgraph/sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { config, HEDERA_MAINNET, HEDERA_TESTNET, hasExecutionConfig } from "./config.js";

function normalizePrivateKey(privateKeyValue: string): `0x${string}` {
  return (privateKeyValue.startsWith("0x") ? privateKeyValue : `0x${privateKeyValue}`) as `0x${string}`;
}

const account = hasExecutionConfig() ? privateKeyToAccount(normalizePrivateKey(config.privateKey)) : null;

export const publicClient = createPublicClient({
  chain: HEDERA_TESTNET,
  transport: http(config.rpcUrl),
});

export const mainnetClient = createPublicClient({
  chain: HEDERA_MAINNET,
  transport: http(config.mainnetRpcUrl),
});

export const walletClient = account
  ? createWalletClient({
      account,
      chain: HEDERA_TESTNET,
      transport: http(config.rpcUrl),
    })
  : null;

export function createHederaOperatorClient(): Client | null {
  if (!config.accountId || !config.privateKey) return null;

  return Client.forTestnet().setOperator(
    config.accountId,
    PrivateKey.fromStringECDSA(normalizePrivateKey(config.privateKey)),
  );
}
