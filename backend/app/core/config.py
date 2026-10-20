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
    remembers the first result and returns the same Settings object every time —
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

    # model_config tells pydantic-settings WHERE to load values from and how to
    # behave. env_file=".env" means "also read a file named .env in the folder
    # the app runs from". extra="ignore" means "don't error on env vars we
    # haven't declared here yet" — handy because our .env lists future-phase
    # variables (Claude, storage, etc.) we haven't modeled yet.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Database (MongoDB Atlas) --- required in Phase 2 --------------------
    # The full Atlas connection string, e.g.
    #   mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
    mongodb_uri: str = ""

    # The logical database name used inside the cluster.
    mongodb_database: str = "ai_it_support"

    # --- Claude LLM (Anthropic) --- required in Phase 4 ----------------------
    # Your Anthropic API key (starts with "sk-ant-..."). Read from .env; never
    # hardcoded. Empty by default so the app still starts without it (only the
    # chat endpoint needs it).
    claude_api_key: str = ""

    # Which Claude model to use. Set this in .env to a model your Anthropic
    # account can access (list them with `client.models.list()`). Model names
    # change over time, so we keep it configurable rather than hardcoded.
    # Default is a fast, low-cost Haiku model — good for development/testing.
    claude_model: str = "claude-haiku-4-5-20251001"

    # --- Embeddings (RAG subsystem) --- required in Phase 2 ------------------
    # RAG turns text into "embeddings" (vectors of numbers) so similar meanings
    # sit close together, which is what makes vector search possible.
    #
    # These three values sit behind a config-selected provider abstraction
    # (Requirement 9.5): the RAG code reads them instead of hardcoding a model,
    # so we can swap the local model for Voyage AI / OpenAI later by changing
    # config only — not the RAG logic.

    # Which embedding backend to use. "local" = offline sentence-transformers
    # (no API key, free). A future value like "voyage"/"openai" would select a
    # different provider implementation.
    embedding_provider: str = "local"

    # The specific model the chosen provider loads. For the local provider this
    # is a sentence-transformers model name. all-MiniLM-L6-v2 is small, fast,
    # and a common default for learning/RAG.
    embedding_model: str = "all-MiniLM-L6-v2"

    # The length of every embedding vector this model produces. all-MiniLM-L6-v2
    # always outputs 384 numbers. This MUST match the MongoDB Atlas vector index
    # dimension (set up in a later task), or vector search will reject the data.
    embedding_dimension: int = 384


@lru_cache
def get_settings() -> Settings:
    """Return the app settings, building them once and caching the result.

    Call this anywhere you need config: `from app.core.config import get_settings`.
    """
    return Settings()
