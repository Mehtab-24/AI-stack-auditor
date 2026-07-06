"""API routes — all FastAPI endpoint definitions.

Endpoints:
    GET  /api/v1/health       — Health check
    POST /api/v1/audit/run    — Run the full agent pipeline
    POST /api/v1/simulate     — Run the Stack Simulator
    GET  /api/v1/demo/dataset — Return the synthetic demo dataset

Note on /audit/run:
    The frontend sends multipart/form-data so that a file can be included
    in the same request as ``use_demo`` and ``business_id``.  FastAPI does
    not support mixing a Pydantic body model with Form fields + UploadFile,
    so each form field is declared as an individual ``Form(...)`` parameter.
"""

from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile

from app.config.settings import settings
from app.core.exceptions import CSVParsingError, ValidationError
from app.core.logging import get_logger
from app.schemas.api import (
    AuditRunResponse,
    DemoDatasetResponse,
    HealthResponse,
)
from app.schemas.simulation import SimulationRequest, SimulationResult
from app.services.orchestrator import AgentOrchestrator
from app.services.stack_simulator import StackSimulatorService
from app.services.supabase_client import save_audit_report
from app.utils.csv_parser import parse_csv
from app.utils.demo_dataset import get_demo_dataset, get_demo_rows
from app.utils.pdf_parser import parse_pdf

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
    use_demo: str = Form(default="false"),
    business_id: str = Form(default=""),
    csv_content: str = Form(default=""),
    file: UploadFile | None = File(default=None),
) -> AuditRunResponse:
    """Run the full agent pipeline.

    Accepts **multipart/form-data** (preferred, supports file upload) with fields:
    - ``use_demo``    — "true" / "false" (string because it's a form field)
    - ``business_id`` — optional UUID to persist results to Supabase
    - ``csv_content`` — optional raw CSV string (alternative to file upload)
    - ``file``        — optional CSV or PDF file upload

    Also accepts **JSON body** via the legacy endpoint for backwards compatibility.

    Returns the complete audit report.
    """
    is_demo = use_demo.lower() in {"true", "1", "yes"}
    clean_business_id = business_id.strip() or None

    raw_rows = await _resolve_input_form(is_demo, csv_content, file)

    logger.info("Starting audit pipeline with %d rows (demo=%s)", len(raw_rows), is_demo)
    report = await _orchestrator.run_audit(raw_rows)
    logger.info(
        "Audit complete — %d tools, %d findings, $%.0f/mo savings",
        report.tools_discovered,
        len(report.findings),
        report.total_monthly_savings,
    )

    # Persist to Supabase when business_id is present and not demo mode
    persisted = False
    if clean_business_id and not is_demo:
        logger.info("Persisting audit report for business_id=%s", clean_business_id)
        db_id = await save_audit_report(business_id=clean_business_id, report=report)
        persisted = db_id is not None
        if persisted:
            logger.info("Report persisted with DB id=%s", db_id)
        else:
            logger.warning("Supabase persistence returned None — report not saved")

    return AuditRunResponse(success=True, report=report, persisted=persisted)


# ── Simulate ─────────────────────────────────────────────────────────────────


@router.post("/simulate", response_model=SimulationResult, tags=["Simulator"])
async def run_simulation(request: SimulationRequest) -> SimulationResult:
    """Run the Stack Simulator with a hypothetical scenario.

    Accepts JSON body with ``tools`` (list of SimTool) and ``hypothetical`` string.
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


async def _resolve_input_form(
    is_demo: bool,
    csv_content: str,
    file: UploadFile | None,
) -> list[dict]:
    """Resolve the audit input from form fields or file upload.

    Priority:
    1. If ``is_demo`` is true → use the built-in demo dataset.
    2. If a file is uploaded → detect type and parse (CSV or PDF).
    3. If ``csv_content`` is non-empty → parse the raw string.
    4. Otherwise → error.
    """
    # 1. Demo mode
    if is_demo:
        logger.info("Using demo dataset")
        return get_demo_rows()

    # 2. File upload — detect CSV or PDF
    if file is not None and file.filename:
        content = await file.read()
        if not content:
            raise CSVParsingError(message="Uploaded file is empty.")

        filename = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()
        is_pdf = "pdf" in content_type or filename.endswith(".pdf")
        is_txt = "text" in content_type or filename.endswith(".txt") or filename.endswith(".log")

        if is_pdf:
            logger.info("Parsing uploaded PDF invoice: %s", file.filename)
            return parse_pdf(content)
        elif is_txt:
            logger.info("Parsing uploaded unstructured text file: %s", file.filename)
            try:
                text_content = content.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise CSVParsingError(message="Text file is not valid UTF-8.") from exc
            from app.utils.text_parser import parse_unstructured_text
            return await parse_unstructured_text(text_content)
        else:
            logger.info("Parsing uploaded CSV: %s", file.filename)
            try:
                return parse_csv(content)
            except CSVParsingError as csv_err:
                try:
                    text_content = content.decode("utf-8")
                    from app.utils.text_parser import parse_unstructured_text
                    return await parse_unstructured_text(text_content)
                except Exception:
                    raise csv_err

    # 3. Raw CSV string
    if csv_content.strip():
        return parse_csv(csv_content)

    # 4. Nothing provided
    raise ValidationError(
        message=(
            "No input data provided. "
            "Upload a CSV/PDF file, send csv_content, or set use_demo=true."
        ),
    )
