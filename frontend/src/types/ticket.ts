export type TicketStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type Ticket = {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
};

export type TicketListResponse = {
  items: Ticket[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type TicketCreatePayload = {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  assigned_to?: string;
};
