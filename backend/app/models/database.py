import copy
import os
from typing import Any

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError


class InMemoryCursor:
    def __init__(self, docs: list[dict]):
        self._docs = docs

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            for key, order in reversed(key_or_list):
                reverse = order == -1
                self._docs.sort(key=lambda d: (d.get(key) is None, d.get(key)), reverse=reverse)
        else:
            reverse = direction == -1
            self._docs.sort(key=lambda d: (d.get(key_or_list) is None, d.get(key_or_list)), reverse=reverse)
        return self

    def __iter__(self):
        for doc in self._docs:
            yield copy.deepcopy(doc)

    def __len__(self):
        return len(self._docs)


class InMemoryCollection:
    def __init__(self, name: str):
        self.name = name
        self.documents: list[dict] = []
        self.indexes: list[dict] = []

    def create_index(self, keys, **kwargs):
        self.indexes.append({"keys": keys, "options": kwargs})
        return str(keys)

    def _matches(self, doc: dict, filter_query: dict) -> bool:
        if not filter_query:
            return True
        for key, expected in filter_query.items():
            if key == "$or":
                if not any(self._matches(doc, cond) for cond in expected):
                    return False
                continue
            if isinstance(expected, dict):
                if "$ne" in expected:
                    if doc.get(key) == expected["$ne"]:
                        return False
            else:
                if doc.get(key) != expected:
                    return False
        return True

    def find(self, filter_query: dict | None = None) -> InMemoryCursor:
        filter_query = filter_query or {}
        matches = [copy.deepcopy(doc) for doc in self.documents if self._matches(doc, filter_query)]
        return InMemoryCursor(matches)

    def find_one(self, filter_query: dict | None = None) -> dict | None:
        filter_query = filter_query or {}
        for doc in self.documents:
            if self._matches(doc, filter_query):
                return copy.deepcopy(doc)
        return None

    def insert_one(self, doc: dict):
        for idx in self.indexes:
            options = idx.get("options", {})
            if options.get("unique"):
                keys = idx["keys"]
                partial_filter = options.get("partialFilterExpression")
                if partial_filter:
                    passes = True
                    for pkey, pcond in partial_filter.items():
                        if "$type" in pcond and pcond["$type"] == "string":
                            if not isinstance(doc.get(pkey), str):
                                passes = False
                    if not passes:
                        continue
                query = {k: doc.get(k) for k, _ in keys if doc.get(k) is not None}
                if len(query) == len(keys):
                    if any(all(existing.get(k) == doc.get(k) for k in query) for existing in self.documents):
                        raise DuplicateKeyError(f"Duplicate key error on unique index {keys}")

        if any(existing.get("_id") == doc.get("_id") for existing in self.documents):
            raise DuplicateKeyError(f"Duplicate _id: {doc.get('_id')}")

        doc_copy = copy.deepcopy(doc)
        self.documents.append(doc_copy)

        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id

        return InsertResult(doc.get("_id"))

    def update_one(self, filter_query: dict, update: dict):
        class UpdateResult:
            def __init__(self, matched_count, modified_count):
                self.matched_count = matched_count
                self.modified_count = modified_count

        matched = None
        for doc in self.documents:
            if self._matches(doc, filter_query):
                matched = doc
                break

        if matched is None:
            return UpdateResult(0, 0)

        if "$set" in update:
            for k, v in update["$set"].items():
                matched[k] = copy.deepcopy(v)

        return UpdateResult(1, 1)

    def delete_one(self, filter_query: dict):
        for i, doc in enumerate(self.documents):
            if self._matches(doc, filter_query):
                del self.documents[i]
                break


class InMemoryDatabase:
    def __init__(self, name: str):
        self.name = name
        self.collections: dict[str, InMemoryCollection] = {}

    def __getitem__(self, name: str) -> InMemoryCollection:
        if name not in self.collections:
            self.collections[name] = InMemoryCollection(name)
        return self.collections[name]


class InMemoryMongoClient:
    def __init__(self, *args, **kwargs):
        self.databases: dict[str, InMemoryDatabase] = {}

    def __getitem__(self, name: str) -> InMemoryDatabase:
        if name not in self.databases:
            self.databases[name] = InMemoryDatabase(name)
        return self.databases[name]

    def close(self):
        pass


def is_mock_uri(uri: str | None) -> bool:
    if not uri:
        return True
    return uri.startswith(("mongomock://", "sqlite://", "memory://")) or uri in {":memory:", "mock"}


def get_mongo_client(uri: str | None = None) -> Any:
    if is_mock_uri(uri):
        return InMemoryMongoClient()
    return MongoClient(uri)


def get_database_from_client(client: Any, db_name: str = "financial_navigator") -> Any:
    if hasattr(client, "get_default_database"):
        try:
            default_db = client.get_default_database(default=None)
            if default_db is not None:
                return default_db
        except Exception:
            pass
    return client[db_name]


def init_db(db: Any) -> None:
    # Goals collection schema / indexes
    db["goals"].create_index([("id", 1)], unique=True)
    db["goals"].create_index([("customer_id", 1)])
    db["goals"].create_index(
        [("customer_id", 1), ("funding_account_id", 1)],
        unique=True,
        partialFilterExpression={"funding_account_id": {"$type": "string"}},
    )

    # Scenarios collection schema / indexes
    db["scenarios"].create_index([("id", 1)], unique=True)
    db["scenarios"].create_index([("customer_id", 1)])


class Base:
    """Declarative base placeholder for backwards compatibility."""
    pass


class Db:
    _client = None

    def __init__(self, uri: str | None = None, db_name: str | None = None):
        if uri:
            self.client = get_mongo_client(uri)
        else:
            if Db._client is None:
                uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
                Db._client = get_mongo_client(uri)
            self.client = Db._client

        self.db_name = db_name or os.getenv("MONGO_DB_NAME", "financial_navigator")
        self.db = get_database_from_client(self.client, self.db_name)


def database(url: str, db_name: str = "financial_navigator"):
    client = get_mongo_client(url)
    db = get_database_from_client(client, db_name)
    try:
        init_db(db)
    except Exception:
        pass
    return client, db
