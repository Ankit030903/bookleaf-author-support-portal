"""Seed the assignment's sample authors, books, and demo login accounts.

Run from the backend directory after configuring backend/.env:
    python seed.py
The script is safe to run repeatedly; existing records are not duplicated.
"""
import json
from datetime import date
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.models import Author, Book, Role, User

BACKEND_DIR = Path(__file__).resolve().parent
_DEFAULT_DATA_PATH = BACKEND_DIR / "data" / "bookleaf_sample_data.json"
DATA_PATH = Path(settings.sample_data_path or _DEFAULT_DATA_PATH).expanduser()
if not DATA_PATH.is_absolute():
    DATA_PATH = (BACKEND_DIR / DATA_PATH).resolve()

AUTHOR_DEMO_PASSWORD = settings.demo_password
ADMIN_DEMO_PASSWORD = settings.admin_password


def parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def seed() -> None:
    if not DATA_PATH.is_file():
        raise FileNotFoundError(
            f"Sample data file not found: {DATA_PATH}. Set SAMPLE_DATA_PATH or restore backend/data/bookleaf_sample_data.json."
        )

    with DATA_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)

    authors_data = data.get("authors")
    if not isinstance(authors_data, list):
        raise ValueError("Sample data must contain an 'authors' list.")

    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        for author_data in authors_data:
            author_email = author_data["email"].strip().lower()
            author = db.query(Author).filter_by(external_id=author_data["author_id"]).first()
            if not author:
                author = Author(
                    external_id=author_data["author_id"],
                    name=author_data["name"],
                    email=author_email,
                    phone=author_data.get("phone"),
                    city=author_data.get("city"),
                    joined_date=parse_date(author_data.get("joined_date")),
                )
                db.add(author)
                db.flush()

            for book_data in author_data.get("books", []):
                book = db.query(Book).filter_by(external_id=book_data["book_id"]).first()
                if book:
                    continue
                db.add(
                    Book(
                        external_id=book_data["book_id"],
                        author_id=author.id,
                        title=book_data["title"],
                        isbn=book_data["isbn"],
                        genre=book_data["genre"],
                        publication_date=parse_date(book_data.get("publication_date")),
                        status=book_data["status"],
                        mrp=book_data.get("mrp"),
                        author_royalty_per_copy=book_data.get("author_royalty_per_copy"),
                        total_copies_sold=book_data.get("total_copies_sold") or 0,
                        total_royalty_earned=book_data.get("total_royalty_earned") or 0,
                        royalty_paid=book_data.get("royalty_paid") or 0,
                        royalty_pending=book_data.get("royalty_pending") or 0,
                        last_royalty_payout_date=parse_date(book_data.get("last_royalty_payout_date")),
                        print_partner=book_data.get("print_partner"),
                        available_on=book_data.get("available_on") or [],
                    )
                )

            db.flush()
            user = db.query(User).filter_by(email=author_email).first()
            if not user:
                db.add(
                    User(
                        email=author_email,
                        password_hash=hash_password(AUTHOR_DEMO_PASSWORD),
                        role=Role.AUTHOR,
                        author_id=author.id,
                    )
                )

        admin_email = settings.admin_email.strip().lower()
        admin = db.query(User).filter_by(email=admin_email).first()
        if not admin:
            db.add(
                User(
                    email=admin_email,
                    password_hash=hash_password(ADMIN_DEMO_PASSWORD),
                    role=Role.ADMIN,
                )
            )

        db.commit()
        book_count = sum(len(author.get("books", [])) for author in authors_data)
        print(f"Seed complete: {len(authors_data)} authors and {book_count} books in the sample file.")
        print(f"Author login email examples: {', '.join(a['email'] for a in authors_data[:3])}")
        print(f"Admin login email: {admin_email}")
        print("Passwords were not printed. Use DEMO_PASSWORD and ADMIN_PASSWORD from your local environment file.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
