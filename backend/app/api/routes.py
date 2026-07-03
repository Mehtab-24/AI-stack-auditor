"""API routes — all FastAPI endpoint definitions.

Endpoints:
    GET  /api/v1/health       — Health check
    POST /api/v1/audit/run    — Run the full agent pipeline
    POST /api/v1/simulate     — Run the Stack Simulator
    GET  /api/v1/demo/dataset — Return the synthetic demo dataset
"""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from app.config.settings import settings
from app.core.exceptions import CSVParsingError, ValidationError
from app.core.logging import get_logger
from app.schemas.api import (
    AuditRunRequest,
    AuditRunResponse,
    DemoDatasetResponse,
    HealthResponse,
)
from app.schemas.simulation import SimulationRequest, SimulationResult
from app.services.orchestrator import AgentOrchestrator
from app.services.stack_simulator import StackSimulatorService
from app.utils.csv_parser import parse_csv
from app.utils.demo_dataset import get_demo_dataset, get_demo_rows

logger = get_logger("api.routes")

router = APIRouter(prefix="/api/v1")

# ── Shared service instances ─────────────────────────────────────────────────
# Stateless — safe to reuse across requests.
_orchestrator = AgentOrchestrator()
_simulator = StackSimulatorService()


# ── Health ───────────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """Return the service health status and version."""
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
    )


# ── Audit ────────────────────────────────────────────────────────────────────


@router.post("/audit/run", response_model=AuditRunResponse, tags=["Audit"])
async def run_audit(
    body: AuditRunRequest | None = None,
    file: UploadFile | None = File(default=None),
) -> AuditRunResponse:
    """Run the full agent pipeline.

    Accepts either:
    - A JSON body with ``csv_content`` (raw CSV string), or
    - A JSON body with ``use_demo: true``, or
    - A multipart file upload.

    Returns the complete audit report.
    """
    raw_rows = await _resolve_input(body, file)

    logger.info("Starting audit pipeline with %d rows", len(raw_rows))
    report = await _orchestrator.run_audit(raw_rows)
    logger.info(
        "Audit complete — %d tools, %d findings, $%.0f/mo savings",
        report.tools_discovered,
        len(report.findings),
        report.total_monthly_savings,
    )

    return AuditRunResponse(success=True, report=report)


# ── Simulate ─────────────────────────────────────────────────────────────────


@router.post("/simulate", response_model=SimulationResult, tags=["Simulator"])
async def run_simulation(request: SimulationRequest) -> SimulationResult:
    """Run the Stack Simulator with a hypothetical scenario.

    Returns an ephemeral result — nothing is persisted.
    """
    logger.info("Running simulation: %s", request.hypothetical[:80])
    result = await _simulator.simulate(request)
    return result


# ── Demo ─────────────────────────────────────────────────────────────────────


@router.get("/demo/dataset", response_model=DemoDatasetResponse, tags=["Demo"])
async def get_demo() -> DemoDatasetResponse:
    """Return the synthetic demo dataset."""
    data = get_demo_dataset()
    return DemoDatasetResponse(**data)


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _resolve_input(
    body: AuditRunRequest | None,
    file: UploadFile | None,
) -> list[dict]:
    """Resolve the audit input from either JSON body or file upload.

    Priority:
    1. If ``use_demo`` is true → use the built-in demo dataset.
    2. If a file is uploaded → parse it as CSV.
    3. If ``csv_content`` is provided → parse the raw string.
    4. Otherwise → error.
    """
    # 1. Demo mode
    if body and body.use_demo:
        logger.info("Using demo dataset")
        return get_demo_rows()

    # 2. File upload
    if file is not None:
        content = await file.read()
        if not content:
            raise CSVParsingError(message="Uploaded file is empty.")
        return parse_csv(content)

    # 3. Raw CSV string in body
    if body and body.csv_content:
        return parse_csv(body.csv_content)

    # 4. Nothing provided
    raise ValidationError(
        message="No input data provided. Send a CSV file, csv_content string, or set use_demo=true.",
    )
