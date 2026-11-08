import html
import time

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict

from app.api.dependencies import DB, Nessie
from app.schemas.goals import ResourceID
from app.services.goal_service import goal_record, owned_goal

router = APIRouter(tags=["Goal news"])


class NewsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    customer_id: ResourceID


@router.post("/goals/{goal_id}/news")
async def check_goal_news(goal_id: str, body: NewsRequest, request: Request, client: Nessie, db: DB) -> dict:
    row = owned_goal(db, goal_id, client.customer_id(body.customer_id))
    return await request.app.state.goal_news.check(goal_record(db, row))


@router.get("/goal-news/{report_id}/search-suggestions", response_class=HTMLResponse)
def search_suggestions(report_id: str, customer_id: str, request: Request, client: Nessie):
    cached = request.app.state.goal_news.reports.get(report_id)
    if not cached or cached[0] < time.monotonic() or cached[1] != client.customer_id(customer_id):
        raise HTTPException(404, "News report expired. Check the goal again.")
    _, _, report, suggestions = cached
    links = "".join(f'<li><a href="{html.escape(s["url"], quote=True)}" target="_blank" rel="noopener noreferrer">'
                    f'[{s["index"] + 1}] {html.escape(s["title"])}</a></li>' for s in report["sources"])
    page = ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
            '<title>Canopy · Google Search sources</title><style>body{font:15px/1.6 system-ui;color:#0b3a5b;'
            'background:#f5fbfe;padding:16px;max-width:700px;margin:auto}pre{white-space:pre-wrap;font:inherit}</style>'
            f'<h1>Goal news</h1><pre>{html.escape(report["text"])}</pre><ul>{links}</ul>{suggestions}</html>')
    return HTMLResponse(page, headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; form-action 'none'",
                                       "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
                                       "Referrer-Policy": "no-referrer"})
