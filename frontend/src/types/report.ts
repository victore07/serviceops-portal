export type ReportSummary = {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    high_priority_tickets: number;
    urgent_tickets: number;
    unassigned_tickets: number;
  };
  
  export type ReportCountItem = {
    label: string;
    count: number;
  };
  
  export type AgentWorkloadItem = {
    assigned_to: string;
    open_count: number;
    in_progress_count: number;
    resolved_count: number;
    total_count: number;
  };