/**
 * Contract addresses configuration
 * Loaded from environment variables
 */

export const CONTRACTS = {
  // Factory contract (creates pools)
  FACTORY: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
    process.env.SANCA_FACTORY) as `0x${string}`,

  // Token addresses
  USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    process.env.USDC_ADDY) as `0x${string}`,

  // Pool implementation (for reference)
  POOL_IMPL: (process.env.NEXT_PUBLIC_POOL_IMPL_ADDRESS ||
    process.env.SANCA_POOL_IMPL) as `0x${string}`,
} as const;

