from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class TrainCategory(str, Enum):
    VANDE_BHARAT = "VANDE_BHARAT"
    RAJDHANI = "RAJDHANI"
    SUPERFAST = "SUPERFAST"
    EXPRESS = "EXPRESS"
    PASSENGER = "PASSENGER"
    FREIGHT = "FREIGHT"

class TractionType(str, Enum):
    ELECTRIC = "ELECTRIC"
    DIESEL = "DIESEL"

class Direction(str, Enum):
    NORTHBOUND = "NORTHBOUND"
    SOUTHBOUND = "SOUTHBOUND"
    BIDIRECTIONAL = "BIDIRECTIONAL"

class LineType(str, Enum):
    MAIN = "MAIN"
    LOOP = "LOOP"
    TERMINAL = "TERMINAL"

class TrainStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    DELAYED = "DELAYED"
    REPLATFORMED = "REPLATFORMED"
    HELD = "HELD"
    CANCELLED = "CANCELLED"

class Platform(BaseModel):
    id: str
    number: int
    name: str
    length_coaches: int = 24  # max coaches platform can hold
    electrified: bool = True
    line_type: LineType = LineType.MAIN
    direction_allowed: Direction = Direction.BIDIRECTIONAL
    max_speed_kmh: int = 50
    has_accessible_ramp: bool = True
    is_active: bool = True
    notes: Optional[str] = ""

class Station(BaseModel):
    id: str = "STN-NEW-DELHI-EXP"
    name: str = "Devgarh Central Junction"
    code: str = "DVGC"
    division: str = "Northern Railway Division"
    platforms: List[Platform]
    min_headway_buffer_minutes: int = 10  # safety separation between consecutive trains on same platform
    throat_track_count: int = 4  # approach switches
    walking_transfer_minutes: int = 8

class Train(BaseModel):
    id: str
    train_number: str
    name: str
    category: TrainCategory = TrainCategory.EXPRESS
    priority: int = Field(default=3, ge=1, le=5)  # 1 = Highest (Vande Bharat), 5 = Lowest (Freight)
    length_coaches: int = 24
    traction: TractionType = TractionType.ELECTRIC
    direction: Direction = Direction.NORTHBOUND
    origin: str
    destination: str
    scheduled_arrival: str  # "HH:MM" e.g. "08:15"
    scheduled_departure: str  # "HH:MM" e.g. "08:35"
    min_dwell_minutes: int = 10
    preferred_platform: Optional[int] = None
    assigned_platform: Optional[int] = None
    status: TrainStatus = TrainStatus.SCHEDULED
    inbound_delay_minutes: int = 0
    actual_arrival: Optional[str] = None
    actual_departure: Optional[str] = None
    delay_departure_minutes: int = 0
    passenger_load: int = 1200
    notes: Optional[str] = ""

class PlatformClosure(BaseModel):
    id: str
    platform_number: int
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"
    reason: str
    active: bool = True

class DisruptionEvent(BaseModel):
    id: str
    type: str  # "TRAIN_DELAY", "PLATFORM_CLOSURE", "SIGNAL_FAILURE", "SPEED_RESTRICTION"
    train_id: Optional[str] = None
    train_number: Optional[str] = None
    delay_minutes: Optional[int] = 0
    platform_number: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    description: str
    created_at: Optional[str] = None

class NaturalLanguageDisruptionRequest(BaseModel):
    text: str

class NaturalLanguageDisruptionResponse(BaseModel):
    parsed: bool
    description: str
    extracted_events: List[DisruptionEvent]
    confidence_score: float
    explanation: str

class ReplanRequest(BaseModel):
    station: Station
    trains: List[Train]
    closures: List[PlatformClosure] = []
    objective_weights: Optional[Dict[str, float]] = {
        "delay_weight": 2.0,
        "platform_swap_weight": 1.5,
        "priority_scale": 3.0
    }

class ChangeExplanation(BaseModel):
    train_id: str
    train_number: str
    train_name: str
    old_platform: Optional[int]
    new_platform: Optional[int]
    old_arrival: str
    new_arrival: str
    old_departure: str
    new_departure: str
    delay_minutes: int
    platform_changed: bool
    reasons: List[str]
    rule_applied: str

class ValidationResult(BaseModel):
    is_valid: bool
    safety_compliance_score: float  # 0 to 100
    errors: List[str]
    warnings: List[str]
    overlap_checks_passed: bool
    headway_buffer_passed: bool
    platform_length_passed: bool
    traction_compatibility_passed: bool
    closure_conflict_passed: bool
    dwell_time_passed: bool
    audit_timestamp: str
    validator_engine_version: str = "RailFlow Independent Safety Verifier v1.4"

class ReplanResponse(BaseModel):
    success: bool
    solver_used: str  # "OR-Tools CP-SAT" or "Deterministic Fallback Heuristic"
    solver_time_ms: float
    replanned_trains: List[Train]
    explanations: List[ChangeExplanation]
    validation: ValidationResult
    metrics: Dict[str, Any]
    summary_message: str

class Scenario(BaseModel):
    id: str
    name: str
    description: str
    station: Station
    trains: List[Train]
    closures: List[PlatformClosure] = []
    disruptions: List[DisruptionEvent] = []
    is_benchmark: bool = False
    created_at: Optional[str] = None
