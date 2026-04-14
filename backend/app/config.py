from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://pdfuser:pdfpassword@db:5432/pdfdb"
    storage_dir: str = "/storage"
    session_ttl_seconds: int = 3600


settings = Settings()
