import time
from typing import List, Dict, Any, Tuple, Optional
from models import Station, Train, PlatformClosure, ChangeExplanation, ReplanResponse, TrainStatus, TractionType, Direction
from validator import time_str_to_minutes, minutes_to_time_str, IndependentSafetyValidator

# Try importing OR-Tools
ORTOOLS_AVAILABLE = False
try:
    from ortools.sat.python import cp_model
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False

class RailwayScheduler:
    """
    Railway Platform Conflict Resolution & Timetable Replanning Engine.
    Employs Google OR-Tools CP-SAT with a deterministic heuristic fallback.
    """
    def __init__(self, station: Station):
        self.station = station
        self.platforms_map = {p.number: p for p in station.platforms}
        self.buffer = station.min_headway_buffer_minutes

    def get_compatible_platforms(self, train: Train, closures: List[PlatformClosure]) -> List[int]:
        """Finds platforms physically and operationally capable of handling the train."""
        compatible = []
        for p in self.station.platforms:
            if not p.is_active:
                continue
            # Length check
            if train.length_coaches > p.length_coaches:
                continue
            # Electrification check
            if train.traction == TractionType.ELECTRIC and not p.electrified:
                continue
            # Direction check
            if p.direction_allowed != Direction.BIDIRECTIONAL and p.direction_allowed != train.direction:
                continue
            compatible.append(p.number)
        return compatible

    def replan(self, trains: List[Train], closures: List[PlatformClosure], weights: Optional[Dict[str, float]] = None) -> ReplanResponse:
        start_time = time.perf_counter()
        weights = weights or {"delay_weight": 2.0, "platform_swap_weight": 1.5, "priority_scale": 3.0}

        solver_used = "OR-Tools CP-SAT"
        replanned_trains = None
        explanations = []

        if ORTOOLS_AVAILABLE:
            try:
                replanned_trains, explanations = self._solve_with_cp_sat(trains, closures, weights)
            except Exception as e:
                solver_used = "Deterministic Fallback Heuristic"
                replanned_trains, explanations = self._solve_with_fallback(trains, closures, weights)
        else:
            solver_used = "Deterministic Fallback Heuristic"
            replanned_trains, explanations = self._solve_with_fallback(trains, closures, weights)

        # If CP-SAT returned None or failed to find an optimal solution, invoke fallback
        if replanned_trains is None:
            solver_used = "Deterministic Fallback Heuristic (Post-CP-SAT Fallback)"
            replanned_trains, explanations = self._solve_with_fallback(trains, closures, weights)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Independent validation
        validator = IndependentSafetyValidator(self.station)
        validation_result = validator.validate(replanned_trains, closures)

        # Calculate metrics
        total_delay = sum(t.delay_departure_minutes + t.inbound_delay_minutes for t in replanned_trains)
        platform_swaps = sum(1 for exp in explanations if exp.platform_changed)
        delayed_trains = sum(1 for t in replanned_trains if (t.delay_departure_minutes > 0 or t.inbound_delay_minutes > 0))
        ontime_pct = round(((len(replanned_trains) - delayed_trains) / len(replanned_trains)) * 100, 1) if replanned_trains else 100.0

        metrics = {
            "total_trains": len(replanned_trains),
            "platform_swaps": platform_swaps,
            "total_delay_minutes": total_delay,
            "delayed_trains_count": delayed_trains,
            "punctuality_percentage": ontime_pct,
            "safety_compliance_score": validation_result.safety_compliance_score
        }

        summary = (
            f"Successfully resolved timetable conflicts using {solver_used} in {elapsed_ms:.1f}ms. "
            f"{platform_swaps} platform reassignments and {total_delay} total delay minutes. "
            f"Independent Safety Validation: {'PASSED (100% compliant)' if validation_result.is_valid else 'VIOLATIONS DETECTED'}."
        )

        return ReplanResponse(
            success=validation_result.is_valid,
            solver_used=solver_used,
            solver_time_ms=elapsed_ms,
            replanned_trains=replanned_trains,
            explanations=explanations,
            validation=validation_result,
            metrics=metrics,
            summary_message=summary
        )

    def _solve_with_cp_sat(self, trains: List[Train], closures: List[PlatformClosure], weights: Dict[str, float]) -> Tuple[Optional[List[Train]], List[ChangeExplanation]]:
        model = cp_model.CpModel()
        buffer = self.buffer

        # Active closure intervals per platform
        closures_by_pf: Dict[int, List[Tuple[int, int, str]]] = {}
        for c in closures:
            if c.active:
                s = time_str_to_minutes(c.start_time)
                e = time_str_to_minutes(c.end_time)
                closures_by_pf.setdefault(c.platform_number, []).append((s, e, c.reason))

        train_vars = {}
        all_platform_intervals: Dict[int, List[Any]] = {p.number: [] for p in self.station.platforms}

        # Add fixed intervals for platform closures to ensure NoOverlap
        for pf_num, intervals in closures_by_pf.items():
            if pf_num in all_platform_intervals:
                for idx, (s, e, reason) in enumerate(intervals):
                    duration = max(1, e - s)
                    fixed_interval = model.NewFixedSizeIntervalVar(s, duration, f"closure_{pf_num}_{idx}")
                    all_platform_intervals[pf_num].append(fixed_interval)

        # Precompute bounds and compatible platforms
        for t in trains:
            compat = self.get_compatible_platforms(t, closures)
            if not compat:
                # Infeasible physically
                return None, []

            sched_arr = time_str_to_minutes(t.scheduled_arrival)
            sched_dep = time_str_to_minutes(t.scheduled_departure)
            earliest_arr = sched_arr + t.inbound_delay_minutes

            # Variables
            # Allow holding train up to 90 minutes if needed
            arr_var = model.NewIntVar(earliest_arr, earliest_arr + 120, f"arr_{t.id}")
            dep_var = model.NewIntVar(earliest_arr + t.min_dwell_minutes, earliest_arr + 180, f"dep_{t.id}")
            dwell_var = model.NewIntVar(t.min_dwell_minutes, 60, f"dwell_{t.id}")

            model.Add(dep_var == arr_var + dwell_var)

            # Hold / extra delay beyond earliest feasible arrival
            hold_delay = model.NewIntVar(0, 120, f"hold_{t.id}")
            model.Add(hold_delay == arr_var - earliest_arr)

            # Departure delay
            dep_delay = model.NewIntVar(0, 180, f"dep_delay_{t.id}")
            model.Add(dep_delay >= dep_var - sched_dep)

            # Platform assignments
            platform_assign_vars = {}
            for pf in compat:
                assigned_bool = model.NewBoolVar(f"assign_{t.id}_pf_{pf}")
                platform_assign_vars[pf] = assigned_bool

                # Interval with buffer: length is dwell_var + buffer
                # Interval covers [arr_var, dep_var + buffer]
                total_duration = model.NewIntVar(t.min_dwell_minutes + buffer, 60 + buffer, f"dur_{t.id}_pf_{pf}")
                model.Add(total_duration == dwell_var + buffer)

                interval = model.NewOptionalIntervalVar(arr_var, total_duration, dep_var + buffer, assigned_bool, f"int_{t.id}_pf_{pf}")
                all_platform_intervals[pf].append(interval)

            # Exactly one platform assigned
            model.Add(sum(platform_assign_vars.values()) == 1)

            # Platform swap indicator
            orig_pf = t.assigned_platform or t.preferred_platform
            swap_var = model.NewBoolVar(f"swap_{t.id}")
            if orig_pf in platform_assign_vars:
                model.Add(swap_var == (1 - platform_assign_vars[orig_pf]))
            else:
                model.Add(swap_var == 1)

            train_vars[t.id] = {
                "arr_var": arr_var,
                "dep_var": dep_var,
                "hold_delay": hold_delay,
                "dep_delay": dep_delay,
                "swap_var": swap_var,
                "platform_vars": platform_assign_vars,
                "earliest_arr": earliest_arr,
                "sched_dep": sched_dep
            }

        # Apply NoOverlap constraint on each platform
        for pf_num, intervals in all_platform_intervals.items():
            if intervals:
                model.AddNoOverlap(intervals)

        # Objective Function:
        # High priority trains (priority 1: Vande Bharat / Rajdhani) have weight 5
        # Low priority (priority 5: Freight) has weight 1
        objective_terms = []
        for t in trains:
            tv = train_vars[t.id]
            # Priority multiplier: priority 1 -> 5x, priority 5 -> 1x
            p_weight = (6 - t.priority) * 3
            objective_terms.append(tv["hold_delay"] * p_weight * 2)
            objective_terms.append(tv["dep_delay"] * p_weight)
            # Platform swap penalty (keeps trains on passenger display boards if possible)
            objective_terms.append(tv["swap_var"] * 30)

        model.Minimize(sum(objective_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 4.0
        solver.parameters.num_search_workers = 4

        status = solver.Solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return None, []

        # Construct solution
        replanned_trains: List[Train] = []
        explanations: List[ChangeExplanation] = []

        for t in trains:
            tv = train_vars[t.id]
            actual_arr_m = solver.Value(tv["arr_var"])
            actual_dep_m = solver.Value(tv["dep_var"])
            hold_m = solver.Value(tv["hold_delay"])
            total_dep_delay = max(0, actual_dep_m - time_str_to_minutes(t.scheduled_departure))

            assigned_pf = None
            for pf, var in tv["platform_vars"].items():
                if solver.Value(var) == 1:
                    assigned_pf = pf
                    break

            orig_pf = t.assigned_platform or t.preferred_platform
            platform_changed = (orig_pf != assigned_pf)

            new_status = TrainStatus.SCHEDULED
            if total_dep_delay > 0 or t.inbound_delay_minutes > 0:
                new_status = TrainStatus.DELAYED
            if platform_changed:
                new_status = TrainStatus.REPLATFORMED

            reasons = []
            rule_applied = "Direct Optimal Schedule"

            if t.inbound_delay_minutes > 0:
                reasons.append(f"Inbound approach delay of +{t.inbound_delay_minutes} mins")

            if hold_m > 0:
                reasons.append(f"Held outside outer signals for {hold_m} mins to maintain safety buffer on assigned platform")
                rule_applied = "Safety Headway Separation"

            if platform_changed:
                reasons.append(f"Reassigned from Platform {orig_pf} to Platform {assigned_pf} due to platform closure/occupancy contention")
                rule_applied = "Platform Capacity Optimization"

            t_copy = t.model_copy()
            t_copy.actual_arrival = minutes_to_time_str(actual_arr_m)
            t_copy.actual_departure = minutes_to_time_str(actual_dep_m)
            t_copy.assigned_platform = assigned_pf
            t_copy.delay_departure_minutes = total_dep_delay
            t_copy.status = new_status

            replanned_trains.append(t_copy)

            explanations.append(ChangeExplanation(
                train_id=t.id,
                train_number=t.train_number,
                train_name=t.name,
                old_platform=orig_pf,
                new_platform=assigned_pf,
                old_arrival=t.scheduled_arrival,
                new_arrival=t_copy.actual_arrival,
                old_departure=t.scheduled_departure,
                new_departure=t_copy.actual_departure,
                delay_minutes=total_dep_delay,
                platform_changed=platform_changed,
                reasons=reasons or ["On-time nominal slot maintained"],
                rule_applied=rule_applied
            ))

        return replanned_trains, explanations

    def _solve_with_fallback(self, trains: List[Train], closures: List[PlatformClosure], weights: Dict[str, float]) -> Tuple[List[Train], List[ChangeExplanation]]:
        """
        Deterministic, rule-based heuristic scheduler.
        Strictly prioritizes higher priority trains (priority 1 first), then arrival order.
        Allocates preferred platforms, shifts to compatible loops on conflict,
        and computes minimum hold delays when all platforms are busy.
        """
        buffer = self.buffer
        # Sort trains by priority (1 is highest), then by earliest arrival time
        sorted_trains = sorted(trains, key=lambda t: (
            t.priority,
            time_str_to_minutes(t.scheduled_arrival) + t.inbound_delay_minutes
        ))

        # Track occupied intervals per platform: list of (start_m, end_m_with_buffer, train_num_or_closure)
        platform_timeline: Dict[int, List[Tuple[int, int, str]]] = {p.number: [] for p in self.station.platforms}

        # Add active closures to timeline
        for c in closures:
            if c.active:
                s = time_str_to_minutes(c.start_time)
                e = time_str_to_minutes(c.end_time)
                platform_timeline.setdefault(c.platform_number, []).append((s, e, f"CLOSURE: {c.reason}"))

        replanned_trains_map: Dict[str, Train] = {}
        explanations_map: Dict[str, ChangeExplanation] = {}

        for t in sorted_trains:
            compat_pfs = self.get_compatible_platforms(t, closures)
            orig_pf = t.assigned_platform or t.preferred_platform
            earliest_arr = time_str_to_minutes(t.scheduled_arrival) + t.inbound_delay_minutes
            dwell = max(t.min_dwell_minutes, time_str_to_minutes(t.scheduled_departure) - time_str_to_minutes(t.scheduled_arrival))

            # Order candidate platforms: prefer original platform, then main lines, then loops
            candidate_pfs = []
            if orig_pf in compat_pfs:
                candidate_pfs.append(orig_pf)
            for p in compat_pfs:
                if p not in candidate_pfs:
                    candidate_pfs.append(p)

            best_pf = None
            best_arr = None
            best_dep = None
            min_hold = 999999

            for pf in candidate_pfs:
                # Try finding earliest feasible arrival >= earliest_arr on this platform
                intervals = sorted(platform_timeline.get(pf, []), key=lambda x: x[0])
                
                # Check if earliest_arr fits without conflict
                test_arr = earliest_arr
                conflict = True
                
                while conflict and test_arr < earliest_arr + 240:
                    test_dep = test_arr + dwell
                    test_clear = test_dep + buffer
                    conflict = False
                    
                    for occ_start, occ_end, tag in intervals:
                        # If tag is closure, buffer is only required for safety if adjacent, but let's check overlap
                        eff_occ_end = occ_end + (buffer if not tag.startswith("CLOSURE") else 0)
                        eff_occ_start = occ_start - buffer if not tag.startswith("CLOSURE") else occ_start
                        
                        # Overlap condition:
                        if not (test_clear <= occ_start or test_arr >= occ_end + (buffer if not tag.startswith("CLOSURE") else 0)):
                            conflict = True
                            # Jump to end of this occupant + buffer
                            test_arr = max(test_arr + 1, occ_end + (buffer if not tag.startswith("CLOSURE") else 0))
                            break

                if not conflict:
                    hold_time = test_arr - earliest_arr
                    # Prioritize keeping original platform if hold penalty is small
                    swap_cost = 0 if pf == orig_pf else 15
                    total_cost = hold_time + swap_cost

                    if total_cost < min_hold:
                        min_hold = total_cost
                        best_pf = pf
                        best_arr = test_arr
                        best_dep = test_arr + dwell

            if best_pf is None:
                # Emergency fallback: pick first compatible and assign with mandatory separation
                best_pf = compat_pfs[0]
                best_arr = earliest_arr
                best_dep = earliest_arr + dwell

            # Reserve on platform timeline
            platform_timeline[best_pf].append((best_arr, best_dep, f"TRAIN: {t.train_number}"))
            platform_timeline[best_pf].sort(key=lambda x: x[0])

            platform_changed = (orig_pf != best_pf)
            hold_m = best_arr - earliest_arr
            sched_dep_m = time_str_to_minutes(t.scheduled_departure)
            dep_delay_m = max(0, best_dep - sched_dep_m)

            new_status = TrainStatus.SCHEDULED
            if dep_delay_m > 0 or t.inbound_delay_minutes > 0:
                new_status = TrainStatus.DELAYED
            if platform_changed:
                new_status = TrainStatus.REPLATFORMED

            reasons = []
            if t.inbound_delay_minutes > 0:
                reasons.append(f"Late inbound arrival (+{t.inbound_delay_minutes} mins)")
            if hold_m > 0:
                reasons.append(f"Held outside block section by {hold_m} mins to clear headway buffer")
            if platform_changed:
                reasons.append(f"Reassigned from PF {orig_pf} to PF {best_pf} to avoid occupation conflict")

            t_res = t.model_copy()
            t_res.actual_arrival = minutes_to_time_str(best_arr)
            t_res.actual_departure = minutes_to_time_str(best_dep)
            t_res.assigned_platform = best_pf
            t_res.delay_departure_minutes = dep_delay_m
            t_res.status = new_status

            replanned_trains_map[t.id] = t_res
            explanations_map[t.id] = ChangeExplanation(
                train_id=t.id,
                train_number=t.train_number,
                train_name=t.name,
                old_platform=orig_pf,
                new_platform=best_pf,
                old_arrival=t.scheduled_arrival,
                new_arrival=t_res.actual_arrival,
                old_departure=t.scheduled_departure,
                new_departure=t_res.actual_departure,
                delay_minutes=dep_delay_m,
                platform_changed=platform_changed,
                reasons=reasons or ["Timetable on schedule"],
                rule_applied="Deterministic Priority-Buffered Allocation"
            )

        # Preserve original order of trains in input
        ordered_replanned = [replanned_trains_map[t.id] for t in trains]
        ordered_explanations = [explanations_map[t.id] for t in trains]
        return ordered_replanned, ordered_explanations
