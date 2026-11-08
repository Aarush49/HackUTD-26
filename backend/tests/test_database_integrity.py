from app.config import Settings

def test_settings_repr_does_not_expose_credentials():
    settings = Settings(nessie_api_key="private-key", news_api_key="news-secret", gemini_api_key="gemini-secret",
                        database_url="postgresql://user:password@localhost/db")
    for secret in ("private-key", "news-secret", "gemini-secret", "password"):
        assert secret not in repr(settings)
