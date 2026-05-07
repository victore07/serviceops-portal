import { api } from "./client";
import type {
  Ticket,
  TicketAuditLog,
  TicketComment,
  TicketCommentCreatePayload,
  TicketCreatePayload,
  TicketListResponse,
  TicketPriority,
  TicketStatus,
  TicketUpdatePayload,
} from "../types/ticket";

export type TicketQueryParams = {
  search?: string;
  status_filter?: TicketStatus | "";
  priority?: TicketPriority | "";
  category?: string;
  assigned_to?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
};

export async function getTickets(params: TicketQueryParams = {}) {
  const response = await api.get<TicketListResponse>("/tickets", { params });
  return response.data;
}

export async function getTicket(ticketId: number) {
  const response = await api.get<Ticket>(`/tickets/${ticketId}`);
  return response.data;
}

export async function createTicket(payload: TicketCreatePayload) {
  const response = await api.post<Ticket>("/tickets", payload);
  return response.data;
}

export async function updateTicket(
  ticketId: number,
  payload: TicketUpdatePayload
) {
  const response = await api.patch<Ticket>(`/tickets/${ticketId}`, payload);
  return response.data;
}

export async function deleteTicket(ticketId: number) {
  await api.delete(`/tickets/${ticketId}`);
}

export async function getTicketComments(ticketId: number) {
  const response = await api.get<TicketComment[]>(
    `/tickets/${ticketId}/comments`
  );
  return response.data;
}

export async function createTicketComment(
  ticketId: number,
  payload: TicketCommentCreatePayload
) {
  const response = await api.post<TicketComment>(
    `/tickets/${ticketId}/comments`,
    payload
  );
  return response.data;
}

export async function getTicketAuditLogs(ticketId: number) {
  const response = await api.get<TicketAuditLog[]>(
    `/tickets/${ticketId}/audit-logs`
  );
  return response.data;
}