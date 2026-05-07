import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTicket,
  getTickets,
  type TicketQueryParams,
} from "../api/tickets";
import type {
  Ticket,
  TicketCreatePayload,
  TicketPriority,
} from "../types/ticket";

const initialForm: TicketCreatePayload = {
  title: "",
  description: "",
  category: "",
  priority: "medium",
  assigned_to: "",
};

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [form, setForm] = useState<TicketCreatePayload>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTickets() {
    try {
      setLoading(true);
      setError("");

      const params: TicketQueryParams = {
        page: 1,
        page_size: 20,
        sort_by: "created_at",
        sort_order: "desc",
      };

      if (search) params.search = search;
      if (priority) params.priority = priority;

      const data = await getTickets(params);
      setTickets(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      setError("Could not load tickets. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await createTicket({
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        assigned_to: form.assigned_to || undefined,
      });

      setForm(initialForm);
      await loadTickets();
    } catch (err) {
      console.error(err);
      setError("Could not create ticket. Check the form fields.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
        <section className="hero">
        <div>
            <p className="eyebrow">ServiceOps Portal</p>
            <h1>Ticket Operations Dashboard</h1>
            <p className="hero-text">
            Track support tickets, priorities, assignment, and operational
            workload from one internal dashboard.
            </p>
        </div>

        <div className="hero-side">
            <Link className="secondary-button" to="/dashboard">
            View Dashboard
            </Link>

            <div className="metric-card">
            <span>Total Tickets</span>
            <strong>{total}</strong>
            </div>
        </div>
        </section>

      {error && <div className="error-box">{error}</div>}

      <section className="grid-layout">
        <form className="panel" onSubmit={handleSubmit}>
          <h2>Create Ticket</h2>

          <label>
            Title
            <input
              value={form.title}
              onChange={(e) =>
                setForm((current) => ({ ...current, title: e.target.value }))
              }
              placeholder="VPN connection failing"
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              placeholder="User cannot connect to VPN after password reset."
              required
            />
          </label>

          <label>
            Category
            <input
              value={form.category}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  category: e.target.value,
                }))
              }
              placeholder="Network"
              required
            />
          </label>

          <label>
            Priority
            <select
              value={form.priority}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  priority: e.target.value as TicketPriority,
                }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label>
            Assigned To
            <input
              value={form.assigned_to}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  assigned_to: e.target.value,
                }))
              }
              placeholder="Tier 1 Support"
            />
          </label>

          <button disabled={loading} type="submit">
            {loading ? "Saving..." : "Create Ticket"}
          </button>
        </form>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Tickets</h2>
              <p>{total} total records</p>
            </div>
            <button disabled={loading} onClick={loadTickets}>
              Refresh
            </button>
          </div>

          <div className="filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets..."
            />

            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as TicketPriority | "")
              }
            >
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <button disabled={loading} onClick={loadTickets}>
              Apply
            </button>
          </div>

          <div className="ticket-list">
            {tickets.length === 0 && !loading && (
              <p className="empty-state">No tickets found.</p>
            )}

            {tickets.map((ticket) => (
              <article className="ticket-card" key={ticket.id}>
                <div>
                  <h3>
                    <Link to={`/tickets/${ticket.id}`}>{ticket.title}</Link>
                  </h3>
                  <p>{ticket.description}</p>
                </div>

                <div className="ticket-meta">
                  <span>{ticket.category}</span>
                  <span>{ticket.priority}</span>
                  <span>{ticket.status}</span>
                  <span>{ticket.assigned_to || "Unassigned"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}