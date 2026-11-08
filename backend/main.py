from fastapi import FastAPI
from fastapi import Query
from fastapi.middleware.cors import CORSMiddleware
from database import get_asteroids, get_stats

app = FastAPI(
    title="ASTRA API",
    description="Astronomy Intelligence Platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "project": "ASTRA",
        "message": "Astronomy Inteligence Platform API",
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "astra-backend",
    }

@app.get("/modules")
def get_modules():
    return [
        {"id": "cosmicwatch", "name": "CosmicWatch", "status": "planned"},
        {"id": "solarpulse", "name": "SolarPulse", "status": "planned"},
        {"id": "exoatlas", "name": "ExoAtlas", "status": "planned"},
        {"id": "astroalert", "name": "AstroAlert", "status": "planned"},
    ]

@app.get("/api/cosmicwatch/asteroids")
def list_asteroids(
    limit: int = Query(default=100, ge=1, le=500),
    hazardous_only: bool = False,
):
    records = get_asteroids(
        limit=limit,
        hazardous_only=hazardous_only
    )

    return {
        "count": len(records),
        "data": records,
    }

@app.get("/api/cosmicwatch/stats")
def cosmicwatch_stats():
    return get_stats()