import pytest
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models import Station, Platform, Train, PlatformClosure, TrainStatus, TrainCategory, TractionType, Direction, LineType
from station_data import get_default_station, get_default_trains
from validator import IndependentSafetyValidator, time_str_to_minutes
from scheduler import RailwayScheduler
from disruption_parser import DisruptionNLPParser
from database import RailFlowDatabase

def test_independent_validator_detects_overlap():
    station = get_default_station()
    validator = IndependentSafetyValidator(station)

    # Create two trains with overlapping times on Platform 1
    t1 = Train(
        id="T1", train_number="1001", name="Test Exp 1",
        category=TrainCategory.EXPRESS, priority=2, length_coaches=16,
        traction=TractionType.ELECTRIC, direction=Direction.NORTHBOUND,
        origin="A", destination="B",
        scheduled_arrival="08:00", scheduled_departure="08:30",
        assigned_platform=1
    )
    t2 = Train(
        id="T2", train_number="1002", name="Test Exp 2",
        category=TrainCategory.EXPRESS, priority=2, length_coaches=16,
        traction=TractionType.ELECTRIC, direction=Direction.NORTHBOUND,
        origin="C", destination="D",
        scheduled_arrival="08:15", scheduled_departure="08:45",
        assigned_platform=1
    )

    result = validator.validate([t1, t2], [])
    assert not result.is_valid
    assert not result.overlap_checks_passed
    assert any("COLLISION HAZARD" in err for err in result.errors)

def test_independent_validator_detects_headway_buffer_violation():
    station = get_default_station()
    station.min_headway_buffer_minutes = 10
    validator = IndependentSafetyValidator(station)

    # t1 departs at 08:30, t2 arrives at 08:35 (only 5 min gap, less than 10 min buffer)
    t1 = Train(
        id="T1", train_number="1001", name="Test Exp 1",
        category=TrainCategory.EXPRESS, priority=2, length_coaches=16,
        traction=TractionType.ELECTRIC, direction=Direction.NORTHBOUND,
        origin="A", destination="B",
        scheduled_arrival="08:00", scheduled_departure="08:30",
        assigned_platform=1
    )
    t2 = Train(
        id="T2", train_number="1002", name="Test Exp 2",
        category=TrainCategory.EXPRESS, priority=2, length_coaches=16,
        traction=TractionType.ELECTRIC, direction=Direction.NORTHBOUND,
        origin="C", destination="D",
        scheduled_arrival="08:35", scheduled_departure="08:55",
        assigned_platform=1
    )

    result = validator.validate([t1, t2], [])
    assert not result.is_valid
    assert not result.headway_buffer_passed
    assert any("Insufficient Safety Gap" in err for err in result.errors)

def test_independent_validator_detects_platform_length_exceeded():
    station = get_default_station()
    validator = IndependentSafetyValidator(station)

    # Platform 6 has max 12 coaches. Train has 24 coaches.
    t = Train(
        id="T1", train_number="1001", name="Heavy Rake",
        category=TrainCategory.EXPRESS, priority=2, length_coaches=24,
        traction=TractionType.ELECTRIC, direction=Direction.NORTHBOUND,
        origin="A", destination="B",
        scheduled_arrival="08:00", scheduled_departure="08:20",
        assigned_platform=6
    )

    result = validator.validate([t], [])
    assert not result.is_valid
    assert not result.platform_length_passed
    assert any("Platform Overrun Hazard" in err for err in result.errors)

def test_independent_validator_detects_closed_platform_violation():
    station = get_default_station()
    validator = IndependentSafetyValidator(station)

    t = Train(
        id="T1", train_number="1001", name="Test Train",
        category=TrainCategory.EXPRESS, priority=2, length_coaches=16,
        traction=TractionType.ELECTRIC, direction=Direction.NORTHBOUND,
        origin="A", destination="B",
        scheduled_arrival="08:15", scheduled_departure="08:35",
        assigned_platform=2
    )
    closure = PlatformClosure(
        id="C1", platform_number=2,
        start_time="08:00", end_time="09:00",
        reason="OHE Power Maintenance", active=True
    )

    result = validator.validate([t], [closure])
    assert not result.is_valid
    assert not result.closure_conflict_passed
    assert any("Platform Closure Breach" in err for err in result.errors)

def test_scheduler_resolves_conflict_and_validates():
    station = get_default_station()
    trains = get_default_trains()
    scheduler = RailwayScheduler(station)

    # Close Platform 2
    closure = PlatformClosure(
        id="CL-TEST",
        platform_number=2,
        start_time="08:00",
        end_time="10:30",
        reason="Rail Replacement Work",
        active=True
    )

    response = scheduler.replan(trains, [closure])
    assert response.success
    assert response.validation.is_valid
    assert response.validation.safety_compliance_score >= 90.0
    # No train should be on Platform 2 during the closure
    for t in response.replanned_trains:
        if t.assigned_platform == 2:
            arr_m = time_str_to_minutes(t.actual_arrival)
            dep_m = time_str_to_minutes(t.actual_departure)
            assert dep_m <= time_str_to_minutes("08:00") or arr_m >= time_str_to_minutes("10:30")

def test_disruption_nlp_parser():
    text = (
        "Train 12002 is delayed by 35 minutes due to signal failure in block A. "
        "Also Platform 2 is closed from 08:30 to 10:45 due to track fracture."
    )
    res = DisruptionNLPParser.parse_text(text)
    assert res.parsed
    assert len(res.extracted_events) == 2

    # Check delay event
    delay_evt = next(e for e in res.extracted_events if e.type == "TRAIN_DELAY")
    assert delay_evt.train_number == "12002"
    assert delay_evt.delay_minutes == 35

    # Check closure event
    cl_evt = next(e for e in res.extracted_events if e.type == "PLATFORM_CLOSURE")
    assert cl_evt.platform_number == 2
    assert cl_evt.start_time == "08:30"
    assert cl_evt.end_time == "10:45"

def test_database_persistence():
    db = RailFlowDatabase(":memory:")
    scenarios = db.list_scenarios()
    assert len(scenarios) >= 4  # Benchmarks pre-seeded
