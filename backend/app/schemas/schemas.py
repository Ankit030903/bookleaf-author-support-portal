from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.models import TicketStatus, TicketCategory, Priority

class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    author_id: UUID | None = None

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    external_id: str
    title: str
    isbn: str
    genre: str
    publication_date: date | None
    status: str
    mrp: Decimal | None
    total_copies_sold: int
    total_royalty_earned: Decimal
    royalty_paid: Decimal
    royalty_pending: Decimal
    last_royalty_payout_date: date | None
    print_partner: str | None
    available_on: list

class TicketCreate(BaseModel):
    book_id: UUID | None = None
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=10000)

class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    author_id: UUID
    book_id: UUID | None
    subject: str
    description: str
    category: TicketCategory
    priority: Priority
    status: TicketStatus
    ai_draft: str | None
    created_at: datetime
    updated_at: datetime

class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10000)

class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    ticket_id: UUID
    sender_id: UUID
    body: str
    created_at: datetime

class TicketUpdate(BaseModel):
    status: TicketStatus | None = None
    category: TicketCategory | None = None
    priority: Priority | None = None
    assigned_to: UUID | None = None

class NoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
