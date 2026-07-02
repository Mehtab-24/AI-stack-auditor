"""API-level request and response schemas.

These wrap the domain models for the REST layer and are separate from the
internal agent I/O contracts so the API surface can evolve independently.
"""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.schemas.report import AuditReport


# ── Requests ─────────────────────────────────────────────────────────────────


class AuditRunRequest(BaseModel):
    """Body for ``POST /api/v1/audit/run`` when sending JSON instead of a file."""

    csv_content: str | None = Field(
        default=None,
        description="Raw CSV content as a string. Mutually exclusive with file upload.",
    )
    use_demo: bool = Field(
        default=False,
        description="If true, run the pipeline against the built-in demo dataset.",
    )


# ── Responses ────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Response from the health-check endpoint."""

    status: str = "healthy"
    version: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditRunResponse(BaseModel):
    """Envelope for the audit result."""

    success: bool = True
    report: AuditReport


class DemoDatasetResponse(BaseModel):
    """Response containing the synthetic demo data."""

    company_name: str = ""
    rows: list[dict] = Field(default_factory=list)
    row_count: int = 0


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    error: bool = True
    message: str = ""
    details: dict = Field(default_factory=dict)
