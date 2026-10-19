import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.services.gemini_service import generate_ticket_reply
from app.core.security import get_current_user, require_admin
from app.models.models import User, Role, Ticket, TicketStatus, TicketCategory, Priority, Book, TicketMessage, TicketNote
from app.schemas.schemas import TicketCreate, TicketOut, MessageCreate, MessageOut, TicketUpdate, NoteCreate
from app.services.ticket_triage_service import classify_ticket
from datetime import datetime, date, time, timedelta, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["Tickets"])
admin_router = APIRouter(prefix="/admin/tickets", tags=["Admin Tickets"])

def accessible_ticket(db: Session, ticket_id: str, user: User):
    ticket = db.query(Ticket).options(joinedload(Ticket.messages)).filter(Ticket.id == ticket_id).first()
    if not ticket or (user.role == Role.AUTHOR and ticket.author_id != user.author_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != Role.AUTHOR or not user.author_id:
        raise HTTPException(
            status_code=403,
            detail="Only author accounts can create tickets",
        )

    if payload.book_id:
        book = (
            db.query(Book)
            .filter(
                Book.id == payload.book_id,
                Book.author_id == user.author_id,
            )
            .first()
        )
        if not book:
            raise HTTPException(
                status_code=400,
                detail="Selected book does not belong to this author",
            )

    subject = payload.subject.strip()
    description = payload.description.strip()

    # Automatically classify the ticket using Gemini.
    category, priority = classify_ticket(subject, description)

    ticket = Ticket(
        author_id=user.author_id,
        book_id=payload.book_id,
        subject=subject,
        description=description,
        category=category,
        priority=priority,
    )

    try:
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create the support ticket.",
        )

    return ticket


@router.get("", response_model=list[TicketOut])
def list_tickets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Ticket)
    if user.role == Role.AUTHOR:
        query = query.filter(Ticket.author_id == user.author_id)
    return query.order_by(Ticket.created_at.desc()).all()

@router.get("/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = accessible_ticket(db, ticket_id, user)
    result = {k: getattr(ticket, k) for k in ["id", "author_id", "book_id", "subject", "description", "category", "priority", "status", "ai_draft", "created_at", "updated_at"]}
    result["messages"] = [{"id": m.id, "sender_id": m.sender_id, "body": m.body, "created_at": m.created_at} for m in ticket.messages]
    if user.role == Role.ADMIN:
        result["notes"] = [{"id": n.id, "admin_id": n.admin_id, "body": n.body, "created_at": n.created_at} for n in ticket.notes]
    return result

@router.post("/{ticket_id}/messages", response_model=MessageOut, status_code=201)
def add_message(ticket_id: str, payload: MessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = accessible_ticket(db, ticket_id, user)
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Closed tickets cannot receive messages")
    msg = TicketMessage(ticket_id=ticket.id, sender_id=user.id, body=payload.body.strip())
    db.add(msg)
    if user.role == Role.AUTHOR:
        ticket.status = TicketStatus.OPEN
    db.commit()
    db.refresh(msg)
    return msg

@admin_router.get("")
def admin_list_tickets(
    status: TicketStatus | None = None,
    category: TicketCategory | None = None,
    priority: Priority | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    query = db.query(Ticket)

    if status:
        query = query.filter(Ticket.status == status)

    if category:
        query = query.filter(Ticket.category == category)

    if priority:
        query = query.filter(Ticket.priority == priority)

    if date_from:
        start = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        query = query.filter(Ticket.created_at >= start)

    if date_to:
        end = datetime.combine(
            date_to + timedelta(days=1),
            time.min,
            tzinfo=timezone.utc,
        )
        query = query.filter(Ticket.created_at < end)

    return query.order_by(Ticket.created_at.asc()).all()


@admin_router.patch("/{ticket_id}", response_model=TicketOut)
def update_ticket(ticket_id: str, payload: TicketUpdate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(ticket, key, value)
    db.commit()
    db.refresh(ticket)
    return ticket

@admin_router.post("/{ticket_id}/notes", status_code=201)
def add_note(ticket_id: str, payload: NoteCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    note = TicketNote(ticket_id=ticket.id, admin_id=user.id, body=payload.body.strip())
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "body": note.body, "created_at": note.created_at}

   
@admin_router.post("/{ticket_id}/assign-to-me")
def assign_ticket_to_me(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.assigned_to = user.id
    db.commit()
    db.refresh(ticket)

    return {
        "ticket_id": str(ticket.id),
        "assigned_to": str(ticket.assigned_to),
        "message": "Ticket assigned to you successfully.",
    }


@admin_router.post("/{ticket_id}/ai-draft")
def create_ai_draft(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id)
        .first()
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    try:
        draft = generate_ticket_reply(
            subject=ticket.subject,
            description=ticket.description,
            category=ticket.category.value
            if hasattr(ticket.category, "value")
            else str(ticket.category),
            priority=ticket.priority.value
            if hasattr(ticket.priority, "value")
            else str(ticket.priority),
            status=ticket.status.value
            if hasattr(ticket.status, "value")
            else str(ticket.status),
        )

        ticket.ai_draft = draft
        db.commit()
        db.refresh(ticket)

        return {
            "ticket_id": ticket.id,
            "ai_draft": ticket.ai_draft,
            "message": "AI draft generated successfully.",
        }

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc))


    except Exception:
        # Keep the client response generic and avoid echoing provider details or
        # credentials into application logs.
        logger.exception("AI reply generation failed")
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="Could not generate an AI reply. Please try again.",
        ) from exc


