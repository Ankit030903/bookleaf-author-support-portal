
import json
import logging

from google import genai
from app.core.config import settings
from app.models.models import TicketCategory, Priority

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {item.value for item in TicketCategory}
VALID_PRIORITIES = {item.value for item in Priority}


def classify_ticket(subject: str, description: str) -> tuple[TicketCategory, Priority]:
    """Classify a support ticket and estimate its priority with Gemini."""

    # Safe defaults if the AI service is unavailable.
    default_category = TicketCategory.GENERAL
    default_priority = Priority.MEDIUM

    if not settings.gemini_api_key:
        logger.warning("Gemini API key missing; using default ticket classification.")
        return default_category, default_priority

    prompt = f"""
You classify BookLeaf Publishing support tickets.

Choose exactly one category:
- Royalty & Payments
- ISBN & Metadata Issues
- Printing & Quality
- Distribution & Availability
- Book Status & Production Updates
- General Inquiry

Choose exactly one priority:
- Critical: urgent financial, widespread, or severe operational issue
- High: overdue royalty, ISBN error, serious printing defect, or urgent issue
- Medium: ordinary support request requiring investigation
- Low: general question or non-urgent information request

Use the ticket's content, not assumptions. Return JSON only:
{{"category": "one exact category", "priority": "Critical, High, Medium, or Low"}}

Subject: {subject}
Description: {description}
"""

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
        )

        raw = (response.text or "").strip()
        # Handle responses wrapped in Markdown code fences.
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1]
            if raw.endswith("```"):
                raw = raw[:-3].strip()

        result = json.loads(raw)
        category_value = result.get("category")
        priority_value = result.get("priority")

        if category_value not in VALID_CATEGORIES:
            raise ValueError("Gemini returned an invalid ticket category.")
        if priority_value not in VALID_PRIORITIES:
            raise ValueError("Gemini returned an invalid ticket priority.")

        category = next(item for item in TicketCategory if item.value == category_value)
        priority = next(item for item in Priority if item.value == priority_value)

        return category, priority

    except Exception:
        logger.exception("AI ticket classification failed; using safe defaults.")
        return default_category, default_priority
