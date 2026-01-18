"use client";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../lib/clientAuth";

type DashboardData = {
  todayIncome: number;
  activeRaffles: number;
  finishedRaffles: number;
  pendingClaims: number;
  totalUsers: number;
};

export function AdminFooter() {
  const [role, setRole] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) return;

    setRole(auth.user.role ?? null);

    if (auth.token) {
      fetch("/api/admin/dashboard", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => {
          if (!r.ok) return null;
          return r.json();
        })
        .then((result) => {
          if (result) setData(result);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const isSuper = role === "SUPERADMIN";
  const isMaster = role === "MASTER";
  const isContable = role === "CONTABLE";
  const canSeeFullMetrics = isSuper || isMaster;

  if (loading || !data) {
    return null;
  }

  return (
    <footer className="admin-footer">
      <div className="admin-footer-container">
        <h4 className="admin-footer-title">📊 Métricas en Tiempo Real</h4>
        <div className="admin-footer-metrics">
          {/* Ingresos Hoy - Solo SUPERADMIN/MASTER/CONTABLE */}
          {(canSeeFullMetrics || isContable) && (
            <div className="admin-footer-metric">
              <span className="admin-footer-metric-label">💰 Ingresos Hoy</span>
              <span className="admin-footer-metric-value admin-footer-metric-income">
                {(data.todayIncome ?? 0).toFixed(2)} Bs.
              </span>
            </div>
          )}
          
          <div className="admin-footer-metric">
            <span className="admin-footer-metric-label">🎲 Sorteos Activos</span>
            <span className="admin-footer-metric-value">{data.activeRaffles ?? 0}</span>
          </div>
          
          <div className="admin-footer-metric">
            <span className="admin-footer-metric-label">✅ Finalizados</span>
            <span className="admin-footer-metric-value">{data.finishedRaffles ?? 0}</span>
          </div>
          
          <div className="admin-footer-metric">
            <span className="admin-footer-metric-label">⏳ Reclamos</span>
            <span className="admin-footer-metric-value admin-footer-metric-pending">
              {data.pendingClaims ?? 0}
            </span>
          </div>
          
          {/* Total Usuarios - Solo SUPERADMIN/MASTER */}
          {canSeeFullMetrics && (
            <div className="admin-footer-metric">
              <span className="admin-footer-metric-label">👥 Usuarios</span>
              <span className="admin-footer-metric-value">{data.totalUsers ?? 0}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
