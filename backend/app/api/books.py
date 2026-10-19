from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User, Role, Book
from app.schemas.schemas import BookOut

router = APIRouter(prefix="/books", tags=["Books"])

@router.get("", response_model=list[BookOut])
def list_books(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Book)
    if user.role == Role.AUTHOR:
        if not user.author_id:
            return []
        query = query.filter(Book.author_id == user.author_id)
    return query.order_by(Book.title).all()

@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if user.role == Role.AUTHOR and book.author_id != user.author_id:
        raise HTTPException(status_code=404, detail="Book not found")
    return book
