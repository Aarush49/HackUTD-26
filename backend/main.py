import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

_backend_root = str(Path(__file__).resolve().parent)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from app.main import app  # noqa: E402

if __name__ == "__main__":
    import os
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
