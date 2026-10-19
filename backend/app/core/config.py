from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/bookleaf"
    jwt_secret_key: str = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 720
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    # Comma-separated origins are supported for local and hosted frontends.
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"
    admin_email: str = "admin@bookleaf.com"
    demo_password: str = "BookLeafDemo2026!"
    admin_password: str = "BookLeafAdmin2026!"
    sample_data_path: str | None = None
    seed_sample_data: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Normalize common hosted PostgreSQL URLs to the installed psycopg 3 driver."""
        if isinstance(value, str):
            if value.startswith("postgres://"):
                return value.replace("postgres://", "postgresql+psycopg://", 1)
            if value.startswith("postgresql://"):
                return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @property
    def cors_origins(self) -> list[str]:
        origins: list[str] = []
        for item in self.frontend_url.split(","):
            origin = item.strip().rstrip("/")
            if not origin:
                continue
            if not origin.startswith(("http://", "https://")):
                scheme = "http://" if origin.startswith(("localhost", "127.0.0.1")) else "https://"
                origin = scheme + origin
            origins.append(origin)
        return origins


settings = Settings()
