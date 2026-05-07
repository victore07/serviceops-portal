import { api } from "./client";
import type {
  Ticket,
  TicketCreatePayload,
  TicketListResponse,
  TicketPriority,
  TicketStatus,
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
  payload: Partial<Ticket>
) {
  const response = await api.patch<Ticket>(`/tickets/${ticketId}`, payload);
  return response.data;
}

export async function deleteTicket(ticketId: number) {
  await api.delete(`/tickets/${ticketId}`);
}
