export function serializeJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => (typeof current === "bigint" ? current.toString() : current)),
  ) as T;
}

export function nowSec(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

export function asBigInt(value: bigint | number | string): bigint {
  return typeof value === "bigint" ? value : BigInt(value);
}

export function toNumber(value: bigint | number, divisor = 1): number {
  return Number(value) / divisor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function absInt(value: number): number {
  return value < 0 ? -value : value;
}

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function extractJsonBlock(text: unknown): Record<string, unknown> | null {
  const input = String(text);
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(input.slice(start, end + 1)) as Record<string, unknown>;
  } catch (_error) {
    return null;
  }
}
