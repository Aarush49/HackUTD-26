from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.integrations.nessie_client import NessieClient


def get_nessie(request: Request) -> NessieClient:
    return request.app.state.nessie


def get_db(request: Request):
    with request.app.state.sessions() as session:
        yield session


Nessie = Annotated[NessieClient, Depends(get_nessie)]
DB = Annotated[Session, Depends(get_db)]
