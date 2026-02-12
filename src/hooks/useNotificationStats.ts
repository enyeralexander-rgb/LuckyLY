"use client";

import useSWR from "swr";

interface NotificationStats {
  pendingSlots: number;
  pendingClaims: number;
  readyToExecute: number;
  total: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useNotificationStats(enabled: boolean = true) {
  const { data, error, isLoading } = useSWR<NotificationStats>(
    enabled ? "/api/admin/stats/notifications" : null,
    fetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
      dedupingInterval: 4000,
    }
  );

  return {
    stats: data,
    isLoading,
    isError: error,
  };
}
