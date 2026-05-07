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

export type TicketUpdatePayload = Partial<{
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
}>;

export type TicketComment = {
  id: number;
  ticket_id: number;
  author: string;
  body: string;
  created_at: string;
};

export type TicketCommentCreatePayload = {
  author: string;
  body: string;
};

export type TicketAuditLog = {
  id: number;
  ticket_id: number;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  actor: string;
  created_at: string;
};