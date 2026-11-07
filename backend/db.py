import os
from pymongo import MongoClient

class Db:
    _client = None

    def __init__(self):
        if Db._client is None:
            uri = os.getenv("MONGO_URI")
            Db._client = MongoClient(uri)

        self.client = Db._client
