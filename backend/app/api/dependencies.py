from typing import Annotated, Any

from fastapi import Depends, Request

from app.integrations.nessie_client import NessieClient


def get_nessie(request: Request) -> NessieClient:
    return request.app.state.nessie


def get_db(request: Request) -> Any:
    return request.app.state.db


Nessie = Annotated[NessieClient, Depends(get_nessie)]
DB = Annotated[Any, Depends(get_db)]
