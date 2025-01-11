from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import models as models

# Initialize the database client and GridFS bucket
client: Optional[AsyncIOMotorClient] = None
gridfs_bucket: Optional[AsyncIOMotorGridFSBucket] = None

async def initiate_database():
    global client, gridfs_bucket
    client = AsyncIOMotorClient("mongodb://mongodb:27017")
    database = client["payment_manager"]  #
    await init_beanie(database=database, document_models=models.__all__)
    gridfs_bucket = AsyncIOMotorGridFSBucket(database)

def get_gridfs_bucket():
    return gridfs_bucket

