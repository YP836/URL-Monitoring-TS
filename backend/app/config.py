from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    api_key: str
    secret_key: str = ""
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def default_secret_key(self) -> "Settings":
        if not self.secret_key:
            self.secret_key = self.api_key
        return self


settings = Settings()
