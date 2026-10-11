from typing import List, Tuple
from datetime import datetime
from models import Station, Train, PlatformClosure, ValidationResult, Direction, TractionType

def time_str_to_minutes(t_str: str) -> int:
    """Converts 'HH:MM' string to minutes since midnight."""
    try:
        parts = t_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0

def minutes_to_time_str(m: int) -> str:
    """Converts minutes since midnight to 'HH:MM' string."""
    m = m % 1440
    h = m // 60
    mins = m % 60
    return f"{h:02d}:{mins:02d}"

class IndependentSafetyValidator:
    """
    Independent validation module that verifies railway timetable assignments
    strictly against physical and operational safety standards.
    """
    def __init__(self, station: Station):
        self.station = station
        self.platforms_map = {p.number: p for p in station.platforms}

    def validate(self, trains: List[Train], closures: List[PlatformClosure]) -> ValidationResult:
        errors: List[str] = []
        warnings: List[str] = []
        
        overlap_checks_passed = True
        headway_buffer_passed = True
        platform_length_passed = True
        traction_compatibility_passed = True
        closure_conflict_passed = True
        dwell_time_passed = True

        buffer_min = self.station.min_headway_buffer_minutes

        # Filter active closures
        active_closures = [c for c in closures if c.active]
        closure_windows = []
        for c in active_closures:
            start_m = time_str_to_minutes(c.start_time)
            end_m = time_str_to_minutes(c.end_time)
            closure_windows.append((c.platform_number, start_m, end_m, c.reason))

        # Group trains by assigned platform
        trains_by_platform: dict[int, list[Tuple[Train, int, int]]] = {}

        for t in trains:
            # Determine effective arrival and departure times
            arr_str = t.actual_arrival or t.scheduled_arrival
            dep_str = t.actual_departure or t.scheduled_departure
            
            arr_min = time_str_to_minutes(arr_str)
            dep_min = time_str_to_minutes(dep_str)

            # Check 1: Dwell time validity
            sched_arr_min = time_str_to_minutes(t.scheduled_arrival) + t.inbound_delay_minutes
            if arr_min < sched_arr_min:
                dwell_time_passed = False
                errors.append(
                    f"Temporal Infeasibility: Train {t.train_number} ({t.name}) arrives at {minutes_to_time_str(arr_min)}, "
                    f"before its earliest physically possible arrival {minutes_to_time_str(sched_arr_min)} "
                    f"(Scheduled: {t.scheduled_arrival} + {t.inbound_delay_minutes}m delay)."
                )

            effective_dwell = dep_min - arr_min
            if effective_dwell < t.min_dwell_minutes:
                dwell_time_passed = False
                errors.append(
                    f"Dwell Violation: Train {t.train_number} ({t.name}) has dwell of {effective_dwell} mins, "
                    f"below mandatory safety dwell of {t.min_dwell_minutes} mins."
                )

            # Check 2: Platform assignment existence
            if t.assigned_platform is None or t.assigned_platform <= 0:
                errors.append(f"Unassigned Train: Train {t.train_number} ({t.name}) has no valid assigned platform.")
                continue

            pf_num = t.assigned_platform
            if pf_num not in self.platforms_map:
                errors.append(f"Invalid Platform: Train {t.train_number} assigned to non-existent Platform {pf_num}.")
                continue

            platform = self.platforms_map[pf_num]

            # Check 3: Platform Length compatibility
            if t.length_coaches > platform.length_coaches:
                platform_length_passed = False
                errors.append(
                    f"Platform Overrun Hazard: Train {t.train_number} ({t.name}) has {t.length_coaches} coaches, "
                    f"exceeding Platform {pf_num} max capacity of {platform.length_coaches} coaches."
                )

            # Check 4: Traction / Electrification compatibility
            if t.traction == TractionType.ELECTRIC and not platform.electrified:
                traction_compatibility_passed = False
                errors.append(
                    f"Traction Incompatibility: Electric train {t.train_number} assigned to non-electrified Platform {pf_num}."
                )

            # Check 5: Directional compatibility
            if platform.direction_allowed != Direction.BIDIRECTIONAL and platform.direction_allowed != t.direction:
                warnings.append(
                    f"Direction Mismatch Warning: Train {t.train_number} is {t.direction.value}, "
                    f"while Platform {pf_num} is rated for {platform.direction_allowed.value}."
                )

            # Check 6: Platform Closure conflicts
            for c_pf, c_start, c_end, c_reason in closure_windows:
                if pf_num == c_pf:
                    # Check overlap between [arr_min, dep_min] and [c_start, c_end]
                    if not (dep_min <= c_start or arr_min >= c_end):
                        closure_conflict_passed = False
                        errors.append(
                            f"Platform Closure Breach: Train {t.train_number} occupies Platform {pf_num} during "
                            f"closure interval {minutes_to_time_str(c_start)}-{minutes_to_time_str(c_end)} "
                            f"(Reason: {c_reason})."
                        )

            if pf_num not in trains_by_platform:
                trains_by_platform[pf_num] = []
            trains_by_platform[pf_num].append((t, arr_min, dep_min))

        # Check 7 & 8: Platform Occupancy Overlaps and Minimum Safety Headway Buffers
        for pf_num, train_list in trains_by_platform.items():
            # Sort trains chronologically by arrival
            train_list.sort(key=lambda item: item[1])
            for i in range(len(train_list) - 1):
                t1, arr1, dep1 = train_list[i]
                t2, arr2, dep2 = train_list[i+1]

                # Direct overlap check
                if arr2 < dep1:
                    overlap_checks_passed = False
                    errors.append(
                        f"CRITICAL PLATFORM COLLISION HAZARD: Platform {pf_num} has overlapping occupancy between "
                        f"Train {t1.train_number} ({t1.name}, {minutes_to_time_str(arr1)}-{minutes_to_time_str(dep1)}) and "
                        f"Train {t2.train_number} ({t2.name}, {minutes_to_time_str(arr2)}-{minutes_to_time_str(dep2)})."
                    )
                # Headway buffer check
                elif (arr2 - dep1) < buffer_min:
                    headway_buffer_passed = False
                    errors.append(
                        f"Insufficient Safety Gap: On Platform {pf_num}, Train {t2.train_number} arrives at {minutes_to_time_str(arr2)}, "
                        f"only {arr2 - dep1} mins after Train {t1.train_number} departs at {minutes_to_time_str(dep1)}. "
                        f"Mandatory minimum safety buffer is {buffer_min} mins."
                    )

        # Check 9: Throat bottlenecks (More than throat_track_count trains arriving within 3 minutes)
        all_movements = []
        for t in trains:
            a = time_str_to_minutes(t.actual_arrival or t.scheduled_arrival)
            d = time_str_to_minutes(t.actual_departure or t.scheduled_departure)
            all_movements.append((a, f"Arr {t.train_number}"))
            all_movements.append((d, f"Dep {t.train_number}"))
        
        all_movements.sort(key=lambda x: x[0])
        for i in range(len(all_movements)):
            time_i = all_movements[i][0]
            cluster = [m for m in all_movements if abs(m[0] - time_i) <= 2]
            if len(cluster) > self.station.throat_track_count + 1:
                warnings.append(
                    f"Throat Track Saturation Warning: {len(cluster)} simultaneous movements near {minutes_to_time_str(time_i)}. "
                    f"Approaches may incur speed restrictions."
                )
                break

        # Calculate safety compliance score
        is_valid = len(errors) == 0
        if is_valid:
            score = 100.0 if len(warnings) == 0 else 94.0
        else:
            deductions = len(errors) * 20.0 + len(warnings) * 5.0
            score = max(0.0, 100.0 - deductions)

        return ValidationResult(
            is_valid=is_valid,
            safety_compliance_score=score,
            errors=errors,
            warnings=warnings,
            overlap_checks_passed=overlap_checks_passed,
            headway_buffer_passed=headway_buffer_passed,
            platform_length_passed=platform_length_passed,
            traction_compatibility_passed=traction_compatibility_passed,
            closure_conflict_passed=closure_conflict_passed,
            dwell_time_passed=dwell_time_passed,
            audit_timestamp=datetime.utcnow().isoformat() + "Z",
            validator_engine_version="RailFlow Independent Safety Verifier v1.4"
        )
