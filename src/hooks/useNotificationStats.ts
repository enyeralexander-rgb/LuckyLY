"use client";

import useSWR from "swr";
import { getStoredAuth } from "@/lib/clientAuth";

interface NotificationStats {
  pendingSlots: number;
  pendingClaims: number;
  readyToExecute: number;
  total: number;
}

function fetcherWithAuth(url: string) {
  const auth = getStoredAuth();
  const headers: HeadersInit = {};
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  return fetch(url, { headers, credentials: "same-origin" }).then((res) => {
    if (res.status === 401 || res.status === 403) {
      return { error: "No autenticado", _status: res.status };
    }
    return res.json();
  });
}

export function useNotificationStats(enabled: boolean = true) {
  const { data, error, isLoading } = useSWR<NotificationStats & { error?: string; _status?: number }>(
    enabled ? "/api/admin/stats/notifications" : null,
    fetcherWithAuth,
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const isAuthError = data?.error && (data._status === 401 || data._status === 403);

  return {
    stats: data && !data.error ? data : undefined,
    isLoading,
    isError: error || isAuthError,
  };
}
