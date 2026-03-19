"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchIndexerSnapshot } from "@/lib/indexer";

export function useIndexerSnapshot() {
  return useQuery({
    queryKey: ["indexerSnapshot"],
    queryFn: fetchIndexerSnapshot,
    refetchInterval: 10000,
  });
}
