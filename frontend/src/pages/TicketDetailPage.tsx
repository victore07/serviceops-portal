import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createTicketComment,
  getTicket,
  getTicketAuditLogs,
  getTicketComments,
  updateTicket,
} from "../api/tickets";
import type {
  Ticket,
  TicketAuditLog,
  TicketComment,
  TicketPriority,
  TicketStatus,
  TicketUpdatePayload,
} from "../types/ticket";

export function TicketDetailPage() {
  const { ticketId } = useParams();

  const numericTicketId = Number(ticketId);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [auditLogs, setAuditLogs] = useState<TicketAuditLog[]>([]);
  const [updateForm, setUpdateForm] = useState<TicketUpdatePayload>({});
  const [commentAuthor, setCommentAuthor] = useState("Alex Support");
  const [commentBody, setCommentBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTicketDetail() {
    if (!numericTicketId) {
      setError("Invalid ticket id.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [ticketData, commentData, auditLogData] = await Promise.all([
        getTicket(numericTicketId),
        getTicketComments(numericTicketId),
        getTicketAuditLogs(numericTicketId),
      ]);

      setTicket(ticketData);
      setComments(commentData);
      setAuditLogs(auditLogData);

      setUpdateForm({
        status: ticketData.status,
        priority: ticketData.priority,
        assigned_to: ticketData.assigned_to || "",
      });
    } catch (err) {
      console.error(err);
      setError("Could not load ticket details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTicketDetail();
  }, [ticketId]);

  async function handleUpdateSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await updateTicket(numericTicketId, {
        status: updateForm.status,
        priority: updateForm.priority,
        assigned_to: updateForm.assigned_to || null,
      });

      await loadTicketDetail();
    } catch (err) {
      console.error(err);
      setError("Could not update ticket.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommentSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!commentBody.trim()) return;

    try {
      setLoading(true);
      setError("");

      await createTicketComment(numericTicketId, {
        author: commentAuthor,
        body: commentBody,
      });

      setCommentBody("");
      await loadTicketDetail();
    } catch (err) {
      console.error(err);
      setError("Could not add comment.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !ticket) {
    return (
      <section className="panel">
        <p>Loading ticket...</p>
      </section>
    );
  }

  if (error && !ticket) {
    return (
      <section className="panel">
        <Link className="back-link" to="/">
          ← Back to tickets
        </Link>
        <div className="error-box">{error}</div>
      </section>
    );
  }

  if (!ticket) {
    return (
      <section className="panel">
        <Link className="back-link" to="/">
          ← Back to tickets
        </Link>
        <p>Ticket not found.</p>
      </section>
    );
  }

  return (
    <>
      <section className="detail-header">
        <div>
          <Link className="back-link" to="/">
            ← Back to tickets
          </Link>
          <p className="eyebrow">Ticket #{ticket.id}</p>
          <h1>{ticket.title}</h1>
          <p className="hero-text">{ticket.description}</p>
        </div>

        <div className="metric-card">
          <span>Status</span>
          <strong className="status-text">{ticket.status}</strong>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="detail-grid">
        <section className="panel">
          <h2>Ticket Details</h2>

          <dl className="detail-list">
            <div>
              <dt>Category</dt>
              <dd>{ticket.category}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{ticket.priority}</dd>
            </div>
            <div>
              <dt>Assigned To</dt>
              <dd>{ticket.assigned_to || "Unassigned"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(ticket.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                {ticket.updated_at
                  ? new Date(ticket.updated_at).toLocaleString()
                  : "Not updated yet"}
              </dd>
            </div>
          </dl>
        </section>

        <form className="panel" onSubmit={handleUpdateSubmit}>
          <h2>Update Ticket</h2>

          <label>
            Status
            <select
              value={updateForm.status || "open"}
              onChange={(e) =>
                setUpdateForm((current) => ({
                  ...current,
                  status: e.target.value as TicketStatus,
                }))
              }
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label>
            Priority
            <select
              value={updateForm.priority || "medium"}
              onChange={(e) =>
                setUpdateForm((current) => ({
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
              value={updateForm.assigned_to || ""}
              onChange={(e) =>
                setUpdateForm((current) => ({
                  ...current,
                  assigned_to: e.target.value,
                }))
              }
              placeholder="Application Support"
            />
          </label>

          <button disabled={loading} type="submit">
            {loading ? "Updating..." : "Update Ticket"}
          </button>
        </form>
      </section>

      <section className="detail-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Comments</h2>
              <p>{comments.length} comments</p>
            </div>
          </div>

          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <label>
              Author
              <input
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                required
              />
            </label>

            <label>
              Comment
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add troubleshooting notes or escalation details..."
                required
              />
            </label>

            <button disabled={loading} type="submit">
              {loading ? "Saving..." : "Add Comment"}
            </button>
          </form>

          <div className="timeline">
            {comments.length === 0 && (
              <p className="empty-state">No comments yet.</p>
            )}

            {comments.map((comment) => (
              <article className="timeline-item" key={comment.id}>
                <div className="timeline-dot" />
                <div>
                  <strong>{comment.author}</strong>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                  <p>{comment.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Audit Log</h2>
              <p>{auditLogs.length} events</p>
            </div>
          </div>

          <div className="timeline">
            {auditLogs.length === 0 && (
              <p className="empty-state">No audit history yet.</p>
            )}

            {auditLogs.map((log) => (
              <article className="timeline-item" key={log.id}>
                <div className="timeline-dot" />
                <div>
                  <strong>{log.action}</strong>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                  <p>
                    {log.field_name ? (
                      <>
                        Changed <b>{log.field_name}</b> from{" "}
                        <b>{log.old_value || "empty"}</b> to{" "}
                        <b>{log.new_value || "empty"}</b>
                      </>
                    ) : (
                      log.new_value || log.old_value || `Actor: ${log.actor}`
                    )}
                  </p>
                  <small>Actor: {log.actor}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}