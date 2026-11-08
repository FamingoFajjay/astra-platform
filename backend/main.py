from fastapi import FastAPI
from fastapi import Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
from system_monitor import get_system_status
from database import get_asteroids, get_stats
from datetime import date
import logging

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
    start_date: date | None = None,
    end_date: date | None = None,
    search: str = Query(default="", max_length=100),
    sort_by: str = "approach_datetime",
    sort_order: str = "desc",
):
    if start_date and end_date and start_date > end_date:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=422,
            detail="start_date must not exceed end_date",
        )

    from fastapi import HTTPException

    try:
        records = get_asteroids(
            limit=limit,
            hazardous_only=hazardous_only,
            start_date=start_date.isoformat() if start_date else None,
            end_date=end_date.isoformat() if end_date else None,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    
    return {
        "count": len(records),
        "data": records,
    }

@app.get("/api/cosmicwatch/stats")
def cosmicwatch_stats():
    return get_stats()

logger = logging.getLogger(__name__)

@app.get("/api/system/status")
def system_status():
    try:
        return get_system_status()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="System monitoring unavailable",
        )
