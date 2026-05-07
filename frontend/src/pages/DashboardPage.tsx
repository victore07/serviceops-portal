import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAgentWorkload,
  getReportSummary,
  getTicketsByCategory,
  getTicketsByPriority,
  getTicketsByStatus,
} from "../api/reports";
import type {
  AgentWorkloadItem,
  ReportCountItem,
  ReportSummary,
} from "../types/report";

type DashboardState = {
  summary: ReportSummary | null;
  byStatus: ReportCountItem[];
  byPriority: ReportCountItem[];
  byCategory: ReportCountItem[];
  workload: AgentWorkloadItem[];
};

const initialDashboardState: DashboardState = {
  summary: null,
  byStatus: [],
  byPriority: [],
  byCategory: [],
  workload: [],
};

function formatLabel(label: string) {
  return label.replaceAll("_", " ");
}

function CountList({
  title,
  items,
}: {
  title: string;
  items: ReportCountItem[];
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{items.length} groups</p>
        </div>
      </div>

      <div className="bar-list">
        {items.length === 0 && <p className="empty-state">No data yet.</p>}

        {items.map((item) => {
          const width = `${Math.max((item.count / maxCount) * 100, 8)}%`;

          return (
            <div className="bar-row" key={item.label}>
              <div className="bar-row-header">
                <strong>{formatLabel(item.label)}</strong>
                <span>{item.count}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardState>(
    initialDashboardState
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [summary, byStatus, byPriority, byCategory, workload] =
        await Promise.all([
          getReportSummary(),
          getTicketsByStatus(),
          getTicketsByPriority(),
          getTicketsByCategory(),
          getAgentWorkload(),
        ]);

      setDashboard({
        summary,
        byStatus,
        byPriority,
        byCategory,
        workload,
      });
    } catch (err) {
      console.error(err);
      setError("Could not load dashboard reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = dashboard.summary;

  return (
    <>
      <section className="detail-header">
        <div>
          <Link className="back-link" to="/">
            ← Back to tickets
          </Link>
          <p className="eyebrow">ServiceOps Portal</p>
          <h1>Operations Dashboard</h1>
          <p className="hero-text">
            Monitor ticket volume, backlog, priority risk, category trends, and
            support team workload.
          </p>
        </div>

        <div className="header-actions">
          <Link className="secondary-button" to="/">
            Tickets
          </Link>
          <button disabled={loading} onClick={loadDashboard}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="kpi-grid">
        <article className="metric-card dashboard-card">
          <span>Total Tickets</span>
          <strong>{summary?.total_tickets ?? 0}</strong>
        </article>

        <article className="metric-card dashboard-card">
          <span>Open</span>
          <strong>{summary?.open_tickets ?? 0}</strong>
        </article>

        <article className="metric-card dashboard-card">
          <span>In Progress</span>
          <strong>{summary?.in_progress_tickets ?? 0}</strong>
        </article>

        <article className="metric-card dashboard-card">
          <span>Resolved</span>
          <strong>{summary?.resolved_tickets ?? 0}</strong>
        </article>

        <article className="metric-card dashboard-card">
          <span>High Priority</span>
          <strong>{summary?.high_priority_tickets ?? 0}</strong>
        </article>

        <article className="metric-card dashboard-card risk-card">
          <span>Urgent</span>
          <strong>{summary?.urgent_tickets ?? 0}</strong>
        </article>

        <article className="metric-card dashboard-card">
          <span>Closed</span>
          <strong>{summary?.closed_tickets ?? 0}</strong>
        </article>

        <article className="metric-card dashboard-card">
          <span>Unassigned</span>
          <strong>{summary?.unassigned_tickets ?? 0}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <CountList title="Tickets by Status" items={dashboard.byStatus} />
        <CountList title="Tickets by Priority" items={dashboard.byPriority} />
      </section>

      <section className="dashboard-grid">
        <CountList title="Tickets by Category" items={dashboard.byCategory} />

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Agent Workload</h2>
              <p>{dashboard.workload.length} assigned groups</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assigned To</th>
                  <th>Open</th>
                  <th>In Progress</th>
                  <th>Resolved</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.workload.length === 0 && (
                  <tr>
                    <td colSpan={5}>No workload data yet.</td>
                  </tr>
                )}

                {dashboard.workload.map((agent) => (
                  <tr key={agent.assigned_to}>
                    <td>{agent.assigned_to}</td>
                    <td>{agent.open_count}</td>
                    <td>{agent.in_progress_count}</td>
                    <td>{agent.resolved_count}</td>
                    <td>
                      <strong>{agent.total_count}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </>
  );
}