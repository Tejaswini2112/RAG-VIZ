from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.ingest import router as ingest_router
from api.query import router as query_router

app = FastAPI(title="RAG Visualizer API")

# Allow the React frontend (port 5173) to call this backend (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(query_router)


@app.get("/health")
def health():
    return {"status": "ok"}
