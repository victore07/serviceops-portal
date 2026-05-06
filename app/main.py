import math
from typing import List

from fastapi import Depends, FastAPI, HTTPException, Query
from starlette import status

from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import Ticket
from app.schemas import TicketCreate, TicketListResponse, TicketResponse, TicketUpdate

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
        setattr(ticket, field, value)

    db.commit()
    db.refresh(ticket)

    return ticket


@app.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = get_ticket_or_404(ticket_id, db)

    db.delete(ticket)
    db.commit()

    return None