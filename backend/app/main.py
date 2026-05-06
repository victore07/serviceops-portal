import math
from typing import List

from fastapi import Depends, FastAPI, HTTPException, Query
from starlette import status

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import Ticket, TicketAuditLog, TicketComment
from app.schemas import (
    AgentWorkloadItem,
    ReportCountItem,
    ReportSummaryResponse,
    TicketAuditLogResponse,
    TicketCommentCreate,
    TicketCommentResponse,
    TicketCreate,
    TicketListResponse,
    TicketResponse,
    TicketUpdate,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ServiceOps Portal API",
    description="A ticketing and operations dashboard backend.",
    version="0.2.0",
)

VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_STATUSES = {"open", "in_progress", "blocked", "resolved", "closed"}


def validate_priority(priority: str):
    if priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority. Must be one of: {sorted(VALID_PRIORITIES)}",
        )


def validate_status(ticket_status: str):
    if ticket_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {sorted(VALID_STATUSES)}",
        )


def get_ticket_or_404(ticket_id: int, db: Session):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with id {ticket_id} was not found",
        )

    return ticket


def create_audit_log(
    db: Session,
    ticket_id: int,
    action: str,
    actor: str = "system",
    field_name: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
):
    audit_log = TicketAuditLog(
        ticket_id=ticket_id,
        action=action,
        actor=actor,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
    )

    db.add(audit_log)


def get_counts_by_field(db: Session, field):
    results = (
        db.query(field, func.count(Ticket.id))
        .group_by(field)
        .order_by(func.count(Ticket.id).desc())
        .all()
    )

    return [
        {
            "label": row[0] if row[0] else "Unassigned",
            "count": row[1],
        }
        for row in results
    ]


@app.get("/")
def root():
    return {"message": "ServiceOps Portal API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post(
    "/tickets",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    validate_priority(ticket.priority)

    new_ticket = Ticket(
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority,
        assigned_to=ticket.assigned_to,
    )

    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    create_audit_log(
        db=db,
        ticket_id=new_ticket.id,
        action="created",
        actor="system",
        new_value=f"Ticket created with priority '{new_ticket.priority}'",
    )

    db.commit()

    return new_ticket


@app.get("/tickets", response_model=TicketListResponse)
def list_tickets(
    status_filter: str | None = None,
    priority: str | None = None,
    category: str | None = None,
    assigned_to: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Ticket)

    if status_filter:
        validate_status(status_filter)
        query = query.filter(Ticket.status == status_filter)

    if priority:
        validate_priority(priority)
        query = query.filter(Ticket.priority == priority)

    if category:
        query = query.filter(Ticket.category.ilike(f"%{category}%"))

    if assigned_to:
        query = query.filter(Ticket.assigned_to.ilike(f"%{assigned_to}%"))

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            Ticket.title.ilike(search_pattern)
            | Ticket.description.ilike(search_pattern)
            | Ticket.category.ilike(search_pattern)
            | Ticket.assigned_to.ilike(search_pattern)
        )

    allowed_sort_fields = {
        "id": Ticket.id,
        "title": Ticket.title,
        "category": Ticket.category,
        "priority": Ticket.priority,
        "status": Ticket.status,
        "assigned_to": Ticket.assigned_to,
        "created_at": Ticket.created_at,
        "updated_at": Ticket.updated_at,
    }

    if sort_by not in allowed_sort_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by. Must be one of: {sorted(allowed_sort_fields.keys())}",
        )

    if sort_order not in {"asc", "desc"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sort_order. Must be either 'asc' or 'desc'",
        )

    sort_column = allowed_sort_fields[sort_by]

    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size

    tickets = query.offset(offset).limit(page_size).all()

    return {
        "items": tickets,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@app.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = get_ticket_or_404(ticket_id, db)
    return ticket


@app.patch("/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: Session = Depends(get_db),
):
    ticket = get_ticket_or_404(ticket_id, db)

    update_data = ticket_update.model_dump(exclude_unset=True)

    if "priority" in update_data:
        validate_priority(update_data["priority"])

    if "status" in update_data:
        validate_status(update_data["status"])

    for field, value in update_data.items():
        old_value = getattr(ticket, field)

        if old_value != value:
            create_audit_log(
                db=db,
                ticket_id=ticket.id,
                action="updated",
                actor="system",
                field_name=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value) if value is not None else None,
            )

            setattr(ticket, field, value)

    db.commit()
    db.refresh(ticket)

    return ticket


@app.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = get_ticket_or_404(ticket_id, db)

    create_audit_log(
        db=db,
        ticket_id=ticket.id,
        action="deleted",
        actor="system",
        old_value=f"Deleted ticket: {ticket.title}",
    )

    db.delete(ticket)
    db.commit()

    return None


@app.post(
    "/tickets/{ticket_id}/comments",
    response_model=TicketCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket_comment(
    ticket_id: int,
    comment: TicketCommentCreate,
    db: Session = Depends(get_db),
):
    ticket = get_ticket_or_404(ticket_id, db)

    new_comment = TicketComment(
        ticket_id=ticket.id,
        author=comment.author,
        body=comment.body,
    )

    db.add(new_comment)

    create_audit_log(
        db=db,
        ticket_id=ticket.id,
        action="commented",
        actor=comment.author,
        new_value=comment.body,
    )

    db.commit()
    db.refresh(new_comment)

    return new_comment


@app.get(
    "/tickets/{ticket_id}/comments",
    response_model=list[TicketCommentResponse],
)
def list_ticket_comments(ticket_id: int, db: Session = Depends(get_db)):
    ticket = get_ticket_or_404(ticket_id, db)

    comments = (
        db.query(TicketComment)
        .filter(TicketComment.ticket_id == ticket.id)
        .order_by(TicketComment.created_at.asc())
        .all()
    )

    return comments


@app.get(
    "/tickets/{ticket_id}/audit-logs",
    response_model=list[TicketAuditLogResponse],
)
def list_ticket_audit_logs(ticket_id: int, db: Session = Depends(get_db)):
    logs = (
        db.query(TicketAuditLog)
        .filter(TicketAuditLog.ticket_id == ticket_id)
        .order_by(TicketAuditLog.created_at.asc())
        .all()
    )

    return logs


@app.get("/reports/summary", response_model=ReportSummaryResponse)
def get_report_summary(db: Session = Depends(get_db)):
    total_tickets = db.query(Ticket).count()

    open_tickets = db.query(Ticket).filter(Ticket.status == "open").count()
    in_progress_tickets = db.query(Ticket).filter(Ticket.status == "in_progress").count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status == "resolved").count()
    closed_tickets = db.query(Ticket).filter(Ticket.status == "closed").count()

    high_priority_tickets = db.query(Ticket).filter(Ticket.priority == "high").count()
    urgent_tickets = db.query(Ticket).filter(Ticket.priority == "urgent").count()

    unassigned_tickets = (
        db.query(Ticket)
        .filter((Ticket.assigned_to == None) | (Ticket.assigned_to == ""))
        .count()
    )

    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "in_progress_tickets": in_progress_tickets,
        "resolved_tickets": resolved_tickets,
        "closed_tickets": closed_tickets,
        "high_priority_tickets": high_priority_tickets,
        "urgent_tickets": urgent_tickets,
        "unassigned_tickets": unassigned_tickets,
    }


@app.get("/reports/tickets-by-status", response_model=list[ReportCountItem])
def get_tickets_by_status(db: Session = Depends(get_db)):
    return get_counts_by_field(db, Ticket.status)


@app.get("/reports/tickets-by-priority", response_model=list[ReportCountItem])
def get_tickets_by_priority(db: Session = Depends(get_db)):
    return get_counts_by_field(db, Ticket.priority)


@app.get("/reports/tickets-by-category", response_model=list[ReportCountItem])
def get_tickets_by_category(db: Session = Depends(get_db)):
    return get_counts_by_field(db, Ticket.category)


@app.get("/reports/agent-workload", response_model=list[AgentWorkloadItem])
def get_agent_workload(db: Session = Depends(get_db)):
    assigned_agents = (
        db.query(Ticket.assigned_to)
        .filter(Ticket.assigned_to != None)
        .filter(Ticket.assigned_to != "")
        .group_by(Ticket.assigned_to)
        .all()
    )

    workload = []

    for agent_row in assigned_agents:
        agent = agent_row[0]

        open_count = (
            db.query(Ticket)
            .filter(Ticket.assigned_to == agent, Ticket.status == "open")
            .count()
        )

        in_progress_count = (
            db.query(Ticket)
            .filter(Ticket.assigned_to == agent, Ticket.status == "in_progress")
            .count()
        )

        resolved_count = (
            db.query(Ticket)
            .filter(Ticket.assigned_to == agent, Ticket.status == "resolved")
            .count()
        )

        total_count = db.query(Ticket).filter(Ticket.assigned_to == agent).count()

        workload.append(
            {
                "assigned_to": agent,
                "open_count": open_count,
                "in_progress_count": in_progress_count,
                "resolved_count": resolved_count,
                "total_count": total_count,
            }
        )

    workload.sort(key=lambda item: item["total_count"], reverse=True)

    return workload