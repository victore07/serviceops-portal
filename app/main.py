from typing import List

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import Ticket
from app.schemas import TicketCreate, TicketResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ServiceOps Portal API",
    description="A ticketing and operations dashboard backend.",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"message": "ServiceOps Portal API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/tickets", response_model=TicketResponse)
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
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
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    return tickets
