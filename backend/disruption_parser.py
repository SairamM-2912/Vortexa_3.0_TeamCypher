import re
import uuid
from typing import List
from models import DisruptionEvent, NaturalLanguageDisruptionResponse

class DisruptionNLPParser:
    """
    Robust rule-based and regex natural language processor that converts free-text
    operational incident reports into structured delay and closure events.
    Does NOT assign platforms - merely parses operational telemetry.
    """
    
    @classmethod
    def parse_text(cls, text: str) -> NaturalLanguageDisruptionResponse:
        events: List[DisruptionEvent] = []
        cleaned = text.strip()
        confidence = 0.85

        # 1. Regex patterns for Platform Closures
        # Example: "Platform 2 closed from 08:30 to 10:30 due to track fracture"
        # Example: "PF 3 blocked until 11:00"
        closure_patterns = [
            r'(?:platform|pf)\s*(\d+)\s*(?:is\s*)?(?:closed|blocked|shut|unavailable)\s*(?:from|between)?\s*(\d{1,2}:\d{2})\s*(?:to|and|-)\s*(\d{1,2}:\d{2})(?:\s*(?:due to|because of|for)\s*([^.,;\n]+))?',
            r'(?:platform|pf)\s*(\d+)\s*(?:is\s*)?(?:closed|blocked|shut|unavailable)\s*(?:until|till)\s*(\d{1,2}:\d{2})(?:\s*(?:due to|because of|for)\s*([^.,;\n]+))?',
            r'close\s*(?:platform|pf)\s*(\d+)\s*(?:from|between)?\s*(\d{1,2}:\d{2})\s*(?:to|and|-)\s*(\d{1,2}:\d{2})(?:\s*(?:due to|because of|for)\s*([^.,;\n]+))?'
        ]

        # Check full interval closure
        for match in re.finditer(closure_patterns[0], cleaned, re.IGNORECASE):
            pf_num = int(match.group(1))
            start_t = match.group(2)
            end_t = match.group(3)
            reason = match.group(4) or "Maintenance / Track Block"
            events.append(DisruptionEvent(
                id=f"EVT-CL-{uuid.uuid4().hex[:6]}",
                type="PLATFORM_CLOSURE",
                platform_number=pf_num,
                start_time=start_t,
                end_time=end_t,
                description=f"Platform {pf_num} blocked from {start_t} to {end_t} ({reason.strip()})"
            ))

        # Check 'until' closure
        for match in re.finditer(closure_patterns[1], cleaned, re.IGNORECASE):
            pf_num = int(match.group(1))
            end_t = match.group(2)
            reason = match.group(3) or "Operational Incident / Signal Block"
            # Default start time 08:00 if not specified
            events.append(DisruptionEvent(
                id=f"EVT-CL-{uuid.uuid4().hex[:6]}",
                type="PLATFORM_CLOSURE",
                platform_number=pf_num,
                start_time="08:00",
                end_time=end_t,
                description=f"Platform {pf_num} blocked until {end_t} ({reason.strip()})"
            ))

        # Check 'close platform...'
        for match in re.finditer(closure_patterns[2], cleaned, re.IGNORECASE):
            pf_num = int(match.group(1))
            start_t = match.group(2)
            end_t = match.group(3)
            reason = match.group(4) or "Planned Maintenance Block"
            events.append(DisruptionEvent(
                id=f"EVT-CL-{uuid.uuid4().hex[:6]}",
                type="PLATFORM_CLOSURE",
                platform_number=pf_num,
                start_time=start_t,
                end_time=end_t,
                description=f"Platform {pf_num} blocked from {start_t} to {end_t} ({reason.strip()})"
            ))

        # 2. Regex patterns for Train Delays
        # Example: "Train 12002 delayed by 35 minutes due to signal failure"
        # Example: "22436 running 45 min late"
        # Example: "Delay train 12951 by 25 mins"
        delay_patterns = [
            r'\b(?:train\s+)?([A-Za-z0-9\-]{3,12})\s+(?:is\s+)?(?:delayed|running\s+late|late)\s*(?:by\s*)?(\d+)\s*(?:min|mins|minutes)?(?:\s*(?:due\s+to|because\s+of|for)\s*([^.,;\n]+))?',
            r'\bdelay\s+(?:train\s+)?([A-Za-z0-9\-]{3,12})\s+(?:by\s*)?(\d+)\s*(?:min|mins|minutes)?(?:\s*(?:due\s+to|because\s+of|for)\s*([^.,;\n]+))?',
            r'\b(?:train\s+)?([A-Za-z0-9\-]{3,12})\s*\+(\d+)\s*(?:min|mins|m)\b'
        ]

        for pat in delay_patterns:
            for match in re.finditer(pat, cleaned, re.IGNORECASE):
                train_token = match.group(1).upper()
                # Skip false positives like "PLATFORM", "MINUTES", etc.
                if train_token in ("PLATFORM", "PF", "DELAY", "TIME", "STATION", "HOUR", "MIN"):
                    continue
                try:
                    delay_m = int(match.group(2))
                except (ValueError, IndexError):
                    continue

                reason = "Inbound corridor congestion"
                if len(match.groups()) >= 3 and match.group(3):
                    reason = match.group(3).strip()

                # Avoid duplicate entries for same train
                if not any(e.train_number == train_token and e.type == "TRAIN_DELAY" for e in events):
                    events.append(DisruptionEvent(
                        id=f"EVT-DL-{uuid.uuid4().hex[:6]}",
                        type="TRAIN_DELAY",
                        train_number=train_token,
                        delay_minutes=delay_m,
                        description=f"Train {train_token} inbound delay +{delay_m} mins ({reason})"
                    ))

        if not events:
            # Fallback simple extractor for generic phrases like "45 minutes delay on 12424"
            fallback_match = re.search(r'(\d+)\s*(?:min|minutes)\s*(?:delay|late)\s*(?:on|for)\s*(?:train\s*)?([A-Z0-9\-]+)', cleaned, re.IGNORECASE)
            if fallback_match:
                delay_m = int(fallback_match.group(1))
                train_token = fallback_match.group(2).upper()
                events.append(DisruptionEvent(
                    id=f"EVT-DL-{uuid.uuid4().hex[:6]}",
                    type="TRAIN_DELAY",
                    train_number=train_token,
                    delay_minutes=delay_m,
                    description=f"Train {train_token} inbound delay +{delay_m} mins"
                ))

        parsed_ok = len(events) > 0
        explanation = (
            f"Parsed {len(events)} operational disruption event(s) from incident dispatch text. "
            f"Identified {sum(1 for e in events if e.type == 'PLATFORM_CLOSURE')} platform closure(s) and "
            f"{sum(1 for e in events if e.type == 'TRAIN_DELAY')} train delay(s). Ready for deterministic solver."
            if parsed_ok else
            "Could not detect structured train delays or platform closures in text. Example format: 'Train 12002 is delayed by 35 mins' or 'Platform 2 closed from 08:30 to 10:30'."
        )

        return NaturalLanguageDisruptionResponse(
            parsed=parsed_ok,
            description=cleaned,
            extracted_events=events,
            confidence_score=confidence if parsed_ok else 0.0,
            explanation=explanation
        )
