from typing import List

from fastapi import Depends, FastAPI, HTTPException
from starlette import status

from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import Ticket
from app.schemas import TicketCreate, TicketResponse, TicketUpdate

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


@app.get("/tickets", response_model=List[TicketResponse])
def list_tickets(
    status: str | None = None,
    priority: str | None = None,
    category: str | None = None,
    assigned_to: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Ticket)

    if status:
        validate_status(status)
        query = query.filter(Ticket.status == status)

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

    tickets = query.order_by(Ticket.created_at.desc()).all()
    return tickets


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