from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    category: str = Field(..., min_length=2, max_length=100)
    priority: str = Field(default="medium")
    assigned_to: Optional[str] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, min_length=5)
    category: Optional[str] = Field(default=None, min_length=2, max_length=100)
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None


class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TicketCommentCreate(BaseModel):
    author: str = Field(..., min_length=2, max_length=100)
    body: str = Field(..., min_length=2)


class TicketCommentResponse(BaseModel):
    id: int
    ticket_id: int
    author: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketAuditLogResponse(BaseModel):
    id: int
    ticket_id: int
    action: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    actor: str
    created_at: datetime

    class Config:
        from_attributes = True