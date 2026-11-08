"""
Realistic Mode — FastAPI backend
=================================
Endpoints:
  POST /realistic/parse    — Gemini parses free text → ScenarioQuery
  POST /realistic/generate — REMS lookup → ConditionPoint time series + briefing
  GET  /realistic/health   — liveness check

Run:
  cd backend
  pip install -r requirements.txt
  cp .env.example .env   # then add GEMINI_API_KEY
  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
import time
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from gemini_parser import generate_briefing, parse_scenario
from rems_lookup import CAVEATS, DATA_SOURCE, build_time_series
from schema import GenerateRequest, GenerateResponse, ParseRequest, ParseResponse

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Valles Realistic Mode API",
    description=(
        "Gemini parses user intent; every environmental number "
        "comes from real NASA REMS measurements."
    ),
    version="1.0.0",
)

CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Simple in-memory rate limiter (RPM per IP) ─────────────────────────────────
_rate_buckets: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_RPM = int(os.environ.get("RATE_LIMIT_RPM", "20"))

def _check_rate(ip: str) -> None:
    now = time.monotonic()
    bucket = _rate_buckets[ip]
    _rate_buckets[ip] = [t for t in bucket if now - t < 60.0]
    if len(_rate_buckets[ip]) >= RATE_LIMIT_RPM:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait a moment.")
    _rate_buckets[ip].append(now)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/realistic/health")
def health() -> dict:
    return {"status": "ok", "data_source": DATA_SOURCE}


@app.post("/realistic/parse", response_model=ParseResponse)
async def parse(req: ParseRequest, request: Request) -> ParseResponse:
    """
    Step 1: Gemini parses user text into a structured scenario.
    Returns the scenario for user review/editing before generation.
    """
    _check_rate(request.client.host if request.client else "unknown")

    scenario, assumptions, warnings = parse_scenario(req.text)
    return ParseResponse(scenario=scenario, assumptions=assumptions, warnings=warnings)


@app.post("/realistic/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest, request: Request) -> GenerateResponse:
    """
    Step 2: Look up REMS conditions and generate the time series + mission briefing.
    Uses only real NASA data; Gemini only writes the narrative text.
    """
    _check_rate(request.client.host if request.client else "unknown")

    conditions = build_time_series(req.scenario)
    start      = conditions[0].model_dump()
    briefing   = generate_briefing(req.scenario, start)

    return GenerateResponse(
        scenario=req.scenario,
        conditions=conditions,
        briefing=briefing,
        data_source=DATA_SOURCE,
        caveats=CAVEATS,
    )


# ── Global error handler ───────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_error(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {type(exc).__name__}: {exc}"},
    )

