import os
from pymongo import MongoClient
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

class Base(DeclarativeBase):
    pass

def database(url):
    options = {}
    if url.startswith("sqlite:"):
        options["connect_args"] = {"check_same_thread": False}
        if url in {"sqlite://", "sqlite:///:memory:"}:
            options["poolclass"] = StaticPool
    engine = create_engine(url, **options)
    return engine, sessionmaker(engine, expire_on_commit=False)

class Db:
    _client = None
    def __init__(self):
        if Db._client is None:
            Db._client = MongoClient(os.getenv("MONGO_URI"))
        self.client = Db._client
