import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import Base, engine
from app.models import models  # noqa: F401
from app.api.auth import router as auth_router
from app.api.books import router as books_router
from app.api.tickets import router as tickets_router, admin_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="BookLeaf Author Support API",
    description="Author support portal API with ticket management and optional Gemini assistance.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
def startup() -> None:
    # For this assignment, create missing tables automatically. For larger production
    # deployments, replace this with a versioned migration workflow (e.g. Alembic).
    if settings.environment.lower() == "production" and settings.jwt_secret_key == "CHANGE_ME_TO_A_LONG_RANDOM_SECRET":
        raise RuntimeError("Set a unique JWT_SECRET_KEY before running in production.")
    Base.metadata.create_all(bind=engine)
    if settings.seed_sample_data:
        # Intended for first-time assignment/demo deployment. The seed is idempotent.
        from seed import seed

        seed()
    logger.info("BookLeaf API started.")


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router, prefix="/api/v1")
app.include_router(books_router, prefix="/api/v1")
app.include_router(tickets_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
