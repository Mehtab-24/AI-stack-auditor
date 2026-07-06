"""Supabase persistence service — server-side only.

Writes audit results to Supabase Postgres using the ``service_role`` key,
which bypasses RLS so the backend can write on behalf of any authenticated user.

IMPORTANT:
    - This module must NEVER expose the service_role key in any API response.
    - ROI scores are embedded in the AuditReport JSON but not written to a
      separate DB table (the ``roi_scores`` table is not in the schema).
    - All DB operations are wrapped in try/except — a Supabase failure never
      crashes the audit response; it logs a warning and returns ``None``.

Usage::

    from app.services.supabase_client import get_supabase_service, save_audit_report

    await save_audit_report(business_id="uuid-str", report=audit_report)
"""

from __future__ import annotations

import uuid
from typing import Any

from app.config.settings import settings
from app.core.logging import get_logger
from app.schemas.report import AuditReport

logger = get_logger("services.supabase_client")

_supabase_instance: Any = None


def _get_client() -> Any | None:
    """Return a lazily-initialised Supabase service-role client, or None."""
    global _supabase_instance

    if _supabase_instance is not None:
        return _supabase_instance

    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning(
            "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — "
            "Supabase persistence is disabled"
        )
        return None

    try:
        from supabase import create_client  # type: ignore[import]

        _supabase_instance = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        logger.info("Supabase service-role client initialised")
        return _supabase_instance
    except Exception as exc:  # noqa: BLE001
        logger.warning("Supabase client init failed: %s — persistence disabled", exc)
        return None


async def save_audit_report(business_id: str, report: AuditReport) -> str | None:
    """Persist an AuditReport to Supabase for the given business.

    Writes to: ``reports``, ``tools``, ``findings``, ``recommendations``.
    ROI scores are not separately persisted (no ``roi_scores`` table in schema).

    Parameters
    ----------
    business_id:
        UUID string of the business row in the ``businesses`` table.
    report:
        The completed AuditReport from the Action Agent.

    Returns
    -------
    str | None
        The Supabase-assigned report row ID, or None on failure.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        # ── 1. Insert report row ─────────────────────────────────────────
        report_payload = {
            "id": str(report.id),
            "business_id": business_id,
            "generated_at": report.generated_at.isoformat(),
            "total_monthly_savings": float(report.total_monthly_savings),
            "total_annual_savings": float(report.total_annual_savings),
        }
        report_result = client.table("reports").insert(report_payload).execute()
        db_report_id = report_result.data[0]["id"] if report_result.data else str(report.id)
        logger.info("Persisted report %s to Supabase", db_report_id)

        # ── 2. Insert tools ──────────────────────────────────────────────
        tool_rows = [
            {
                "id": str(tool.id),
                "business_id": business_id,
                "tool_name": tool.tool_name,
                "vendor": tool.vendor,
                "category": tool.category.value,
                "plan_tier": tool.plan_tier,
                "monthly_cost": float(tool.monthly_cost),
                "seats_purchased": tool.seats_purchased,
                "seats_active_estimated": tool.seats_active_estimated,
                "is_ai_addon": tool.is_ai_addon,
                "source": tool.source.value,
                "renewal_date": tool.renewal_date.isoformat() if tool.renewal_date else None,
            }
            for tool in report.tools
        ]
        if tool_rows:
            client.table("tools").insert(tool_rows).execute()
            logger.info("Persisted %d tools", len(tool_rows))

        # ── 3. Insert findings ───────────────────────────────────────────
        # Build a set of valid tool IDs we just persisted so foreign-key
        # references are always valid.
        persisted_tool_ids = {str(t.id) for t in report.tools}
        finding_rows = [
            {
                "id": str(f.id),
                "business_id": business_id,
                "tool_id": str(f.tool_id) if f.tool_id and str(f.tool_id) in persisted_tool_ids else None,
                "finding_type": f.finding_type.value,
                "description": f.description,
                "confidence_score": float(f.confidence_score),
                "generated_by_agent": f.generated_by_agent.value,
            }
            for f in report.findings
        ]
        if finding_rows:
            client.table("findings").insert(finding_rows).execute()
            logger.info("Persisted %d findings", len(finding_rows))

        # ── 4. Insert recommendations ────────────────────────────────────
        # Build a set of valid finding IDs we just persisted.
        persisted_finding_ids = {str(f.id) for f in report.findings}
        recommendation_rows = [
            {
                "id": str(r.id),
                "finding_id": str(r.finding_id),
                "action_type": r.action_type.value,
                "suggested_alternative": r.suggested_alternative,
                "estimated_monthly_savings": float(r.estimated_monthly_savings),
                "estimated_annual_savings": float(r.estimated_annual_savings),
                "status": r.status.value,
            }
            for r in report.recommendations
            if str(r.finding_id) in persisted_finding_ids
        ]
        if recommendation_rows:
            client.table("recommendations").insert(recommendation_rows).execute()
            logger.info("Persisted %d recommendations", len(recommendation_rows))

        return db_report_id

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Supabase persistence failed (business_id=%s): %s — "
            "returning ephemeral result only",
            business_id,
            exc,
        )
        return None
