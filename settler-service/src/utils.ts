export function nowSec(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

export function asBigInt(value: bigint | number | string): bigint {
  return typeof value === "bigint" ? value : BigInt(value);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isLikelyRevert(err: unknown): boolean {
  const message = String(
    (err as { shortMessage?: string; message?: string } | null)?.shortMessage ||
      (err as { message?: string } | null)?.message ||
      err ||
      "",
  ).toLowerCase();
  return (
    message.includes("revert") ||
    message.includes("execution reverted") ||
    message.includes("sancapool:")
  );
}
