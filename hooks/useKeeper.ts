"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchKeeperDecisionHistory, fetchKeeperPoolSummaries } from "@/lib/keeper";

export function useKeeperPoolSummaries() {
  return useQuery({
    queryKey: ["keeperPoolSummaries"],
    queryFn: fetchKeeperPoolSummaries,
    refetchInterval: 15000,
    retry: 1,
  });
}

export function useKeeperDecisionHistory(pool?: string | null) {
  return useQuery({
    queryKey: ["keeperDecisionHistory", pool ?? "all"],
    queryFn: () => fetchKeeperDecisionHistory(pool || undefined),
    refetchInterval: 10000,
    retry: 1,
  });
}

export function useKeeperSummaryMap() {
  const query = useKeeperPoolSummaries();

  const data = useMemo(() => {
    const entries = query.data ?? [];
    return new Map(entries.map((entry) => [entry.address.toLowerCase(), entry]));
  }, [query.data]);

  return {
    ...query,
    data,
  };
}
