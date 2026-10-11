from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from models import (
    Station, Train, PlatformClosure, ReplanRequest, ReplanResponse,
    ValidationResult, NaturalLanguageDisruptionRequest, NaturalLanguageDisruptionResponse,
    Scenario
)
from station_data import get_default_station, get_default_trains
from scheduler import RailwayScheduler, ORTOOLS_AVAILABLE
from validator import IndependentSafetyValidator
from disruption_parser import DisruptionNLPParser
from database import RailFlowDatabase

app = FastAPI(
    title="RailFlow API — Railway Disruption & Platform Conflict Simulator",
    version="1.0.0",
    description="Deterministic railway timetable replanning, constraint solving, and independent safety validation engine."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = RailFlowDatabase()

@app.get("/api/health")
def health_check():
    return {
        "status": "operational",
        "system": "RailFlow Operations Engine",
        "ortools_available": ORTOOLS_AVAILABLE,
        "solver": "Google OR-Tools CP-SAT" if ORTOOLS_AVAILABLE else "Deterministic Rule-Based Fallback",
        "version": "1.0.0"
    }

@app.get("/api/station", response_model=Station)
def get_station():
    # Return default or currently saved active scenario station
    nominal = db.get_scenario("BENCHMARK-NOMINAL")
    if nominal:
        return nominal.station
    return get_default_station()

@app.get("/api/trains", response_model=List[Train])
def get_trains():
    nominal = db.get_scenario("BENCHMARK-NOMINAL")
    if nominal:
        return nominal.trains
    return get_default_trains()

@app.post("/api/validate", response_model=ValidationResult)
def validate_timetable(payload: Dict[str, Any] = Body(...)):
    """Runs independent safety verification without modifying assignments."""
    station_data = payload.get("station")
    trains_data = payload.get("trains", [])
    closures_data = payload.get("closures", [])

    station = Station(**station_data) if station_data else get_default_station()
    trains = [Train(**t) for t in trains_data]
    closures = [PlatformClosure(**c) for c in closures_data]

    validator = IndependentSafetyValidator(station)
    return validator.validate(trains, closures)

@app.post("/api/replan", response_model=ReplanResponse)
def replan_timetable(request: ReplanRequest):
    """
    Executes deterministic constraint satisfaction replanning using CP-SAT or Fallback,
    followed by independent safety validation and explainability logging.
    """
    scheduler = RailwayScheduler(request.station)
    response = scheduler.replan(request.trains, request.closures, request.objective_weights)

    # Persist in audit trail
    db.log_audit(
        scenario_id=request.station.id,
        solver_used=response.solver_used,
        solver_time_ms=response.solver_time_ms,
        total_delay=response.metrics.get("total_delay_minutes", 0),
        platform_swaps=response.metrics.get("platform_swaps", 0),
        safety_score=response.validation.safety_compliance_score,
        summary_message=response.summary_message,
        details={
            "metrics": response.metrics,
            "validation": response.validation.model_dump(),
            "explanations_count": len(response.explanations)
        }
    )

    return response

@app.post("/api/disruption/parse", response_model=NaturalLanguageDisruptionResponse)
def parse_natural_language_disruption(request: NaturalLanguageDisruptionRequest):
    """
    Translates free-text operational disruption descriptions into structured delay
    and closure parameters. Strict rule: does NOT assign platforms.
    """
    return DisruptionNLPParser.parse_text(request.text)

@app.get("/api/scenarios", response_model=List[Dict[str, Any]])
def list_scenarios():
    return db.list_scenarios()

@app.get("/api/scenarios/{scenario_id}", response_model=Scenario)
def get_scenario_by_id(scenario_id: str):
    scenario = db.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario

@app.post("/api/scenarios", response_model=Dict[str, Any])
def save_scenario(scenario: Scenario):
    success = db.save_scenario(scenario)
    return {"success": success, "id": scenario.id, "message": f"Scenario '{scenario.name}' saved successfully."}

@app.delete("/api/scenarios/{scenario_id}")
def delete_scenario(scenario_id: str):
    success = db.delete_scenario(scenario_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete benchmark scenario or scenario not found")
    return {"success": True, "message": "Scenario deleted."}

@app.get("/api/audit-logs")
def get_audit_logs():
    return db.get_audit_logs(limit=25)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
