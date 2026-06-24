from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    api_key: str
    secret_key: str = "default-insecure-secret-key"
    environment: str = "development"

    # Email (SMTP) settings for alert notifications. Optional: the app boots
    # without them; alert delivery simply reports "SMTP not configured".
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def default_secret_key(self) -> "Settings":
        if not self.secret_key:
            self.secret_key = self.api_key
        return self

    @model_validator(mode="after")
    def default_smtp_from(self) -> "Settings":
        if not self.smtp_from:
            self.smtp_from = self.smtp_user
        return self


settings = Settings()
