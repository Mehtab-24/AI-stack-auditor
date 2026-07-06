"""Gemini LLM client with structured-output support and retry logic.

Provides a single ``GeminiClient`` that:
- Calls the Gemini 1.5 Flash model with ``response_mime_type="application/json"``
  so the model is constrained to return valid JSON.
- Retries once with an explicit correction prompt if the first response fails
  JSON parsing.
- Degrades gracefully (returns ``None``) when ``GEMINI_API_KEY`` is not set,
  so every caller must handle the ``None`` case and fall back to a heuristic.

Usage::

    from app.services.llm_client import get_llm_client

    client = get_llm_client()
    result = await client.generate_json(prompt, schema_hint)
    if result is None:
        # use heuristic fallback
"""

from __future__ import annotations

import json
from typing import Any

from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger("services.llm_client")

_client_instance: GeminiClient | None = None


class GeminiClient:
    """Thin wrapper around ``google-generativeai`` for structured JSON output.

    Designed for agent use: every call returns a parsed ``dict`` or ``None``.
    Never raises — callers get ``None`` and fall back to deterministic logic.
    """

    def __init__(self, api_key: str) -> None:
        self._enabled = bool(api_key)
        self._model: Any = None

        if self._enabled:
            try:
                import google.generativeai as genai  # type: ignore[import]

                genai.configure(api_key=api_key)
                self._model = genai.GenerativeModel(
                    model_name="gemini-2.0-flash",
                    generation_config=genai.GenerationConfig(  # type: ignore[attr-defined]
                        response_mime_type="application/json",
                        temperature=0.2,  # Low temperature for structured output
                    ),
                )
                logger.info("Gemini LLM client initialised (model: gemini-2.0-flash)")
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Gemini client init failed: %s — LLM calls will be disabled", exc
                )
                self._enabled = False

    @property
    def is_enabled(self) -> bool:
        """True if a valid API key was provided and the model initialised."""
        return self._enabled

    async def generate_json(
        self,
        prompt: str,
        schema_hint: str = "",
    ) -> dict[str, Any] | None:
        """Call Gemini and return a parsed JSON dict, or ``None`` on failure.

        Parameters
        ----------
        prompt:
            The user prompt sent to the model.
        schema_hint:
            Optional JSON schema description appended to the prompt so the
            model knows exactly what structure to produce.

        Returns
        -------
        dict | None
            Parsed JSON dict, or ``None`` if the client is disabled or parsing
            fails after two attempts.
        """
        if not self._enabled:
            return None

        full_prompt = prompt
        if schema_hint:
            full_prompt = (
                f"{prompt}\n\n"
                f"Return ONLY valid JSON matching this schema (no markdown, no explanation):\n"
                f"{schema_hint}"
            )

        # ── Attempt 1 ────────────────────────────────────────────────────
        raw = await self._call(full_prompt)
        result = _parse_json(raw)
        if result is not None:
            return result

        # ── Attempt 2 — explicit correction prompt ────────────────────────
        if raw:
            correction_prompt = (
                f"Your previous response could not be parsed as JSON:\n"
                f"```\n{raw[:500]}\n```\n\n"
                f"Return ONLY a raw JSON object matching this schema. "
                f"No markdown code fences, no extra text:\n{schema_hint}"
            )
            raw2 = await self._call(correction_prompt)
            result = _parse_json(raw2)
            if result is not None:
                logger.debug("JSON parsed successfully on retry")
                return result

        logger.warning("LLM JSON parse failed after 2 attempts — returning None")
        return None

    async def _call(self, prompt: str) -> str | None:
        """Single API call; returns the text or None on error."""
        if self._model is None:
            return None
        try:
            response = await self._model.generate_content_async(prompt)
            return response.text
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemini API call failed: %s", exc)
            return None


# ── JSON parsing helper ───────────────────────────────────────────────────────


def _parse_json(text: str | None) -> dict[str, Any] | None:
    """Parse a JSON string, stripping markdown code fences if present."""
    if not text:
        return None
    text = text.strip()
    # Strip ```json ... ``` or ``` ... ``` fences
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])  # drop opening fence line
        if text.endswith("```"):
            text = text[: text.rfind("```")]
    try:
        parsed = json.loads(text.strip())
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


# ── Singleton factory ─────────────────────────────────────────────────────────


def get_llm_client() -> GeminiClient:
    """Return the application-wide ``GeminiClient`` singleton."""
    global _client_instance
    if _client_instance is None:
        _client_instance = GeminiClient(api_key=settings.gemini_api_key)
    return _client_instance
