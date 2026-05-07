import { api } from "./client";
import type {
  AgentWorkloadItem,
  ReportCountItem,
  ReportSummary,
} from "../types/report";

export async function getReportSummary() {
  const response = await api.get<ReportSummary>("/reports/summary");
  return response.data;
}

export async function getTicketsByStatus() {
  const response = await api.get<ReportCountItem[]>(
    "/reports/tickets-by-status"
  );
  return response.data;
}

export async function getTicketsByPriority() {
  const response = await api.get<ReportCountItem[]>(
    "/reports/tickets-by-priority"
  );
  return response.data;
}

export async function getTicketsByCategory() {
  const response = await api.get<ReportCountItem[]>(
    "/reports/tickets-by-category"
  );
  return response.data;
}

export async function getAgentWorkload() {
  const response = await api.get<AgentWorkloadItem[]>(
    "/reports/agent-workload"
  );
  return response.data;
}