export type TrainCategory = 
  | 'VANDE_BHARAT' 
  | 'RAJDHANI' 
  | 'SUPERFAST' 
  | 'EXPRESS' 
  | 'PASSENGER' 
  | 'FREIGHT';

export type TractionType = 'ELECTRIC' | 'DIESEL';

export type Direction = 'NORTHBOUND' | 'SOUTHBOUND' | 'BIDIRECTIONAL';

export type LineType = 'MAIN' | 'LOOP' | 'TERMINAL';

export type TrainStatus = 'SCHEDULED' | 'DELAYED' | 'REPLATFORMED' | 'HELD' | 'CANCELLED';

export interface Platform {
  id: string;
  number: number;
  name: string;
  length_coaches: number;
  electrified: boolean;
  line_type: LineType;
  direction_allowed: Direction;
  max_speed_kmh: number;
  has_accessible_ramp: boolean;
  is_active: boolean;
  notes?: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  division: string;
  platforms: Platform[];
  min_headway_buffer_minutes: number;
  throat_track_count: number;
  walking_transfer_minutes: number;
}

export interface Train {
  id: string;
  train_number: string;
  name: string;
  category: TrainCategory;
  priority: number; // 1 (Highest) to 5 (Lowest)
  length_coaches: number;
  traction: TractionType;
  direction: Direction;
  origin: string;
  destination: string;
  scheduled_arrival: string; // "HH:MM"
  scheduled_departure: string; // "HH:MM"
  min_dwell_minutes: number;
  preferred_platform?: number;
  assigned_platform?: number;
  status: TrainStatus;
  inbound_delay_minutes: number;
  actual_arrival?: string;
  actual_departure?: string;
  delay_departure_minutes: number;
  passenger_load: number;
  notes?: string;
}

export interface PlatformClosure {
  id: string;
  platform_number: number;
  start_time: string;
  end_time: string;
  reason: string;
  active: boolean;
}

export interface DisruptionEvent {
  id: string;
  type: 'TRAIN_DELAY' | 'PLATFORM_CLOSURE' | 'SIGNAL_FAILURE' | 'SPEED_RESTRICTION';
  train_id?: string;
  train_number?: string;
  delay_minutes?: number;
  platform_number?: number;
  start_time?: string;
  end_time?: string;
  description: string;
  created_at?: string;
}

export interface ChangeExplanation {
  train_id: string;
  train_number: string;
  train_name: string;
  old_platform?: number;
  new_platform?: number;
  old_arrival: string;
  new_arrival: string;
  old_departure: string;
  new_departure: string;
  delay_minutes: number;
  platform_changed: boolean;
  reasons: string[];
  rule_applied: string;
}

export interface ValidationResult {
  is_valid: boolean;
  safety_compliance_score: number;
  errors: string[];
  warnings: string[];
  overlap_checks_passed: boolean;
  headway_buffer_passed: boolean;
  platform_length_passed: boolean;
  traction_compatibility_passed: boolean;
  closure_conflict_passed: boolean;
  dwell_time_passed: boolean;
  audit_timestamp: string;
  validator_engine_version: string;
}

export interface ReplanResponse {
  success: boolean;
  solver_used: string;
  solver_time_ms: number;
  replanned_trains: Train[];
  explanations: ChangeExplanation[];
  validation: ValidationResult;
  metrics: {
    total_trains: number;
    platform_swaps: number;
    total_delay_minutes: number;
    delayed_trains_count: number;
    punctuality_percentage: number;
    safety_compliance_score: number;
  };
  summary_message: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  station: Station;
  trains: Train[];
  closures: PlatformClosure[];
  disruptions: DisruptionEvent[];
  is_benchmark: boolean;
  created_at?: string;
}
