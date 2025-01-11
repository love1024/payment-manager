from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config.config import initiate_database

from routes.payment import router as PaymentRouter
from routes.upload import router as UploadRouter

@asynccontextmanager
async def lifespan(app: FastAPI):
    await initiate_database()
    yield
       
app = FastAPI(lifespan=lifespan)

# Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can specify a list of allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["Content-Disposition"] # Added this to send file name
)

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to this fantastic app."}

app.include_router(PaymentRouter, tags=["Payments"], prefix="/payments")
app.include_router(UploadRouter, tags=["Upload"], prefix="/upload")