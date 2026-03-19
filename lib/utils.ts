import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert value to BigInt
 */
export function toBigInt(value: bigint | string | number): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string') return BigInt(value);
  return BigInt(value);
}

/**
 * Format USDC amount (6 decimals)
 */
export function formatUSDC(amount: bigint | string | number): string {
  const bigIntAmount = toBigInt(amount);
  return (Number(bigIntAmount) / 1e6).toFixed(2);
}

/**
 * Format address to short format
 */
export function formatAddress(address: string, startLength = 6, endLength = 4): string {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}
