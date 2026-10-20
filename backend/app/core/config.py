"""Application configuration (Phase 2).

WHAT THIS FILE DOES
-------------------
This is the ONE place the app reads its configuration. Instead of scattering
`os.getenv("MONGODB_URI")` calls all over the codebase, we define a single
typed `Settings` class. The rest of the app imports `settings` from here.

NEW CONCEPT: Pydantic Settings
    `BaseSettings` (from pydantic-settings) is like a typed form for your
    environment variables. When the app starts, it:
      1. reads values from the environment and from the local `.env` file,
      2. checks their types,
      3. gives you a normal Python object with attributes (settings.mongodb_uri).
    If something required is missing, you find out immediately at startup with a
    clear error, instead of a confusing crash deep in the app later.

WHY A CACHED getter (get_settings)
    We only want to read and validate config ONCE, then reuse it. `lru_cache`
    remembers the first result and returns the same Settings object every time -
    cheap and consistent. FastAPI can also use this with dependency injection.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from environment / .env.

    Each attribute maps to an environment variable of the SAME name in
    upper-case (pydantic-settings is case-insensitive by default), e.g. the
    attribute `mongodb_uri` is filled from `MONGODB_URI`.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Database (MongoDB Atlas) --- required in Phase 2 --------------------
    mongodb_uri: str = ""

    # The logical database name used inside the cluster.
    mongodb_database: str = "ai_it_support"

    # --- CORS (Cross-Origin Resource Sharing) --- needed once a browser UI calls us
    # NEW CONCEPT: CORS allowed origins.
    #   A browser blocks a page on one origin (scheme+host+port) from calling an
    #   API on a different origin unless the API says that origin is allowed. Our
    #   Next.js frontend runs on http://localhost:3000 while this API runs on
    #   :8000 - different ports = different origins - so we must list the
    #   frontend origin here. This is read as a COMMA-SEPARATED string from the
    #   CORS_ALLOW_ORIGINS env var and split into a list by the property below,
    #   so you can add your deployed frontend URL later without code changes.
    cors_allow_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

    @property
    def cors_origins_list(self) -> list[str]:
        """Split the comma-separated origins string into a clean list."""
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    # --- Claude LLM (Anthropic) --- required in Phase 4 ----------------------
    claude_api_key: str = ""

    # Which Claude model to use. Set this in .env to a model your Anthropic
    # account can access. Default is a fast, low-cost Haiku model.
    claude_model: str = "claude-haiku-4-5-20251001"

    # --- Embeddings (RAG subsystem) --- required in Phase 2 ------------------
    # Which embedding backend to use. "local" = offline sentence-transformers.
    embedding_provider: str = "local"

    # The specific model the chosen provider loads.
    embedding_model: str = "all-MiniLM-L6-v2"

    # The length of every embedding vector this model produces. MUST match the
    # MongoDB Atlas vector index dimension.
    embedding_dimension: int = 384


@lru_cache
def get_settings() -> Settings:
    """Return the app settings, building them once and caching the result."""
    return Settings()

