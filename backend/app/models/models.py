import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Numeric, Date, DateTime, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def now_utc():
    return datetime.now(timezone.utc)

class Role(str, enum.Enum):
    AUTHOR = "author"
    ADMIN = "admin"

class TicketStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"

class TicketCategory(str, enum.Enum):
    ROYALTY = "Royalty & Payments"
    ISBN = "ISBN & Metadata Issues"
    QUALITY = "Printing & Quality"
    DISTRIBUTION = "Distribution & Availability"
    PRODUCTION = "Book Status & Production Updates"
    GENERAL = "General Inquiry"

class Priority(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class Author(Base):
    __tablename__ = "authors"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    city: Mapped[str | None] = mapped_column(String(100))
    joined_date: Mapped[object | None] = mapped_column(Date)
    books = relationship("Book", back_populates="author", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="author")

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role, name="user_role"), nullable=False)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("authors.id"), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class Book(Base):
    __tablename__ = "books"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("authors.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    isbn: Mapped[str] = mapped_column(String(50), nullable=False)
    genre: Mapped[str] = mapped_column(String(150), nullable=False)
    publication_date: Mapped[object | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(100), nullable=False)
    mrp: Mapped[float | None] = mapped_column(Numeric(10, 2))
    author_royalty_per_copy: Mapped[float | None] = mapped_column(Numeric(10, 2))
    total_copies_sold: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_royalty_earned: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    royalty_paid: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    royalty_pending: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    last_royalty_payout_date: Mapped[object | None] = mapped_column(Date)
    print_partner: Mapped[str | None] = mapped_column(String(100))
    available_on: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    author = relationship("Author", back_populates="books")

class Ticket(Base):
    __tablename__ = "tickets"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("authors.id"), index=True, nullable=False)
    book_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("books.id"), nullable=True)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[TicketCategory] = mapped_column(Enum(TicketCategory, name="ticket_category"), default=TicketCategory.GENERAL, nullable=False)
    priority: Mapped[Priority] = mapped_column(Enum(Priority, name="ticket_priority"), default=Priority.MEDIUM, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus, name="ticket_status"), default=TicketStatus.OPEN, nullable=False)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    ai_draft: Mapped[str | None] = mapped_column(Text)
    ai_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)
    author = relationship("Author", back_populates="tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at")
    notes = relationship("TicketNote", back_populates="ticket", cascade="all, delete-orphan")

class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    ticket = relationship("Ticket", back_populates="messages")

class TicketNote(Base):
    __tablename__ = "ticket_notes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    admin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    ticket = relationship("Ticket", back_populates="notes")
