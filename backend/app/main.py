import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import accounts, customers, dashboard, goals, headlines, nessie, products, risk, scenarios, simulation, transactions, transfers
from app.config import Settings
from app.integrations.nessie_client import NessieClient, NessieError
from app.models.database import Base, database
from app.services.goal_service import GoalConflict
from app.services.projection_engine import ScenarioInputError


def create_app(settings: Settings | None = None, *, transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Nessie's query authentication would otherwise appear in HTTPX INFO request logs.
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        engine, app.state.sessions = database(settings.database_url)
        try:
            Base.metadata.create_all(engine)
            app.state.nessie = NessieClient(settings, transport)
            try:
                yield
            finally:
                await app.state.nessie.close()
        finally:
            engine.dispose()

    app = FastAPI(title="Financial Health Navigator", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?",
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(NessieError)
    async def nessie_error(_request: Request, error: NessieError):
        detail = {"code": error.code, "message": str(error)}
        if error.upstream_status is not None:
            detail["upstream_status"] = error.upstream_status
        return JSONResponse(status_code=error.status, content={"detail": detail})

    @app.exception_handler(ScenarioInputError)
    async def scenario_error(_request: Request, error: ScenarioInputError):
        return JSONResponse(status_code=422, content={"detail": {"code": "invalid_scenario", "message": str(error)}})

    @app.exception_handler(GoalConflict)
    async def goal_conflict(_request: Request, error: GoalConflict):
        return JSONResponse(status_code=409, content={"detail": {"code": "goal_conflict", "message": str(error)}})

    @app.get("/health", tags=["System"])
    def health():
        return {"status": "ok"}

    for module in (nessie, customers, accounts, transactions, dashboard, goals, headlines, risk, simulation, products, scenarios, transfers):
        app.include_router(module.router, prefix="/api")
    return app


app = create_app()
