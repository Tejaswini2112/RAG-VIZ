import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.ingest import router as ingest_router
from api.query import router as query_router

app = FastAPI(title="RAG Visualizer API")

# ALLOWED_ORIGINS: comma-separated list of frontend URLs.
# Dev default: localhost:5173. In production, set this env var to your Vercel URL.
_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(query_router)


@app.get("/health")
def health():
    return {"status": "ok"}
