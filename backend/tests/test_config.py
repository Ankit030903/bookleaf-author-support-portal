from app.core.config import Settings


def test_hosted_postgres_urls_use_psycopg_driver():
    assert Settings(database_url="postgres://user:pass@host/db").database_url == (
        "postgresql+psycopg://user:pass@host/db"
    )
    assert Settings(database_url="postgresql://user:pass@host/db").database_url == (
        "postgresql+psycopg://user:pass@host/db"
    )


def test_cors_origins_accept_multiple_frontends():
    settings = Settings(frontend_url="localhost:5173,https://demo.example.com/")
    assert settings.cors_origins == [
        "http://localhost:5173",
        "https://demo.example.com",
    ]
