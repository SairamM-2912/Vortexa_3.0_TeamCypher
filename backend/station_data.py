from typing import List
from models import Station, Platform, Train, PlatformClosure, TrainCategory, TractionType, Direction, LineType, TrainStatus, Scenario

def get_default_station() -> Station:
    platforms = [
        Platform(
            id="PF-1",
            number=1,
            name="Platform 1 (Main Up)",
            length_coaches=24,
            electrified=True,
            line_type=LineType.MAIN,
            direction_allowed=Direction.BIDIRECTIONAL,
            max_speed_kmh=50,
            has_accessible_ramp=True,
            is_active=True,
            notes="Primary main line, direct access to Main Concourse & Metro interchange"
        ),
        Platform(
            id="PF-2",
            number=2,
            name="Platform 2 (Main Down)",
            length_coaches=24,
            electrified=True,
            line_type=LineType.MAIN,
            direction_allowed=Direction.BIDIRECTIONAL,
            max_speed_kmh=50,
            has_accessible_ramp=True,
            is_active=True,
            notes="Heavy intercity main platform with FOB elevators and luggage lifts"
        ),
        Platform(
            id="PF-3",
            number=3,
            name="Platform 3 (Loop 1)",
            length_coaches=22,
            electrified=True,
            line_type=LineType.LOOP,
            direction_allowed=Direction.BIDIRECTIONAL,
            max_speed_kmh=30,
            has_accessible_ramp=True,
            is_active=True,
            notes="Electrified loop platform, ideal for Superfast and long-distance trains"
        ),
        Platform(
            id="PF-4",
            number=4,
            name="Platform 4 (Loop 2)",
            length_coaches=18,
            electrified=True,
            line_type=LineType.LOOP,
            direction_allowed=Direction.BIDIRECTIONAL,
            max_speed_kmh=30,
            has_accessible_ramp=True,
            is_active=True,
            notes="Medium capacity loop platform for 16-18 coach express/intercity services"
        ),
        Platform(
            id="PF-5",
            number=5,
            name="Platform 5 (Goods / Bypass Loop)",
            length_coaches=26,
            electrified=True,
            line_type=LineType.LOOP,
            direction_allowed=Direction.BIDIRECTIONAL,
            max_speed_kmh=25,
            has_accessible_ramp=False,
            is_active=True,
            notes="High length siding line for freight bypass, parcels, and overflow passenger"
        ),
        Platform(
            id="PF-6",
            number=6,
            name="Platform 6 (Bay / Suburban Terminal)",
            length_coaches=12,
            electrified=True,
            line_type=LineType.TERMINAL,
            direction_allowed=Direction.NORTHBOUND,
            max_speed_kmh=20,
            has_accessible_ramp=True,
            is_active=True,
            notes="Short terminal bay line for regional commuters and MEMU trains only"
        )
    ]
    return Station(
        id="STN-DVGC",
        name="Devgarh Central Junction",
        code="DVGC",
        division="Northern Railway Zone",
        platforms=platforms,
        min_headway_buffer_minutes=10,
        throat_track_count=4,
        walking_transfer_minutes=8
    )

def get_default_trains() -> List[Train]:
    return [
        Train(
            id="TR-1",
            train_number="22436",
            name="Vande Bharat Express",
            category=TrainCategory.VANDE_BHARAT,
            priority=1,
            length_coaches=16,
            traction=TractionType.ELECTRIC,
            direction=Direction.NORTHBOUND,
            origin="New Varanasi Junction",
            destination="Devgarh Central",
            scheduled_arrival="07:50",
            scheduled_departure="08:10",
            min_dwell_minutes=15,
            preferred_platform=1,
            assigned_platform=1,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1128,
            notes="Flagship semi-high speed express. Requires premium passenger amenities."
        ),
        Train(
            id="TR-2",
            train_number="12951",
            name="Rajdhani Superfast",
            category=TrainCategory.RAJDHANI,
            priority=1,
            length_coaches=22,
            traction=TractionType.ELECTRIC,
            direction=Direction.SOUTHBOUND,
            origin="Devgarh Central",
            destination="Mumbai Coastal Terminus",
            scheduled_arrival="08:15",
            scheduled_departure="08:35",
            min_dwell_minutes=15,
            preferred_platform=2,
            assigned_platform=2,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1340,
            notes="High priority premium overnight express with catering and AC rakes."
        ),
        Train(
            id="TR-3",
            train_number="12002",
            name="Shatabdi Express",
            category=TrainCategory.SUPERFAST,
            priority=2,
            length_coaches=16,
            traction=TractionType.ELECTRIC,
            direction=Direction.NORTHBOUND,
            origin="Bhopal Junction",
            destination="Devgarh Central",
            scheduled_arrival="08:30",
            scheduled_departure="08:45",
            min_dwell_minutes=12,
            preferred_platform=1,
            assigned_platform=1,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=980,
            notes="Day intercity executive express."
        ),
        Train(
            id="TR-4",
            train_number="12424",
            name="Duronto Superfast",
            category=TrainCategory.SUPERFAST,
            priority=2,
            length_coaches=24,
            traction=TractionType.ELECTRIC,
            direction=Direction.SOUTHBOUND,
            origin="Dibrugarh Cantt",
            destination="Devgarh Central",
            scheduled_arrival="08:40",
            scheduled_departure="09:05",
            min_dwell_minutes=20,
            preferred_platform=3,
            assigned_platform=3,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1450,
            notes="Point-to-point long distance non-stop service."
        ),
        Train(
            id="TR-5",
            train_number="14055",
            name="Brahmaputra Mail",
            category=TrainCategory.EXPRESS,
            priority=3,
            length_coaches=24,
            traction=TractionType.ELECTRIC,
            direction=Direction.NORTHBOUND,
            origin="Kamakhya Junction",
            destination="Devgarh Central",
            scheduled_arrival="09:00",
            scheduled_departure="09:25",
            min_dwell_minutes=20,
            preferred_platform=2,
            assigned_platform=2,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1680,
            notes="High volume 24-coach mail train with heavy parcel load."
        ),
        Train(
            id="TR-6",
            train_number="12280",
            name="Taj Intercity Express",
            category=TrainCategory.EXPRESS,
            priority=3,
            length_coaches=18,
            traction=TractionType.ELECTRIC,
            direction=Direction.NORTHBOUND,
            origin="Jhansi Cantt",
            destination="Devgarh Central",
            scheduled_arrival="09:15",
            scheduled_departure="09:30",
            min_dwell_minutes=12,
            preferred_platform=4,
            assigned_platform=4,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1200,
            notes="Daily business commuter corridor."
        ),
        Train(
            id="TR-7",
            train_number="64002",
            name="MEMU Suburban Passenger",
            category=TrainCategory.PASSENGER,
            priority=4,
            length_coaches=12,
            traction=TractionType.ELECTRIC,
            direction=Direction.NORTHBOUND,
            origin="Ghaziabad Yard",
            destination="Devgarh Central",
            scheduled_arrival="09:20",
            scheduled_departure="09:40",
            min_dwell_minutes=15,
            preferred_platform=6,
            assigned_platform=6,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1850,
            notes="Local commuter train terminating at Devgarh Bay Platform."
        ),
        Train(
            id="TR-8",
            train_number="12616",
            name="Grand Trunk Express",
            category=TrainCategory.EXPRESS,
            priority=3,
            length_coaches=24,
            traction=TractionType.ELECTRIC,
            direction=Direction.SOUTHBOUND,
            origin="Chennai Central",
            destination="Devgarh Central",
            scheduled_arrival="09:35",
            scheduled_departure="10:00",
            min_dwell_minutes=20,
            preferred_platform=1,
            assigned_platform=1,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1550,
            notes="Trans-India cross country superfast service."
        ),
        Train(
            id="TR-9",
            train_number="BOXN-902",
            name="Container Logistics Freight",
            category=TrainCategory.FREIGHT,
            priority=5,
            length_coaches=24,
            traction=TractionType.ELECTRIC,
            direction=Direction.NORTHBOUND,
            origin="Mundra Port",
            destination="Dadri ICD",
            scheduled_arrival="09:45",
            scheduled_departure="10:15",
            min_dwell_minutes=15,
            preferred_platform=5,
            assigned_platform=5,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=0,
            notes="Time-sensitive intermodal freight transit."
        ),
        Train(
            id="TR-10",
            train_number="12723",
            name="Telangana Express",
            category=TrainCategory.SUPERFAST,
            priority=2,
            length_coaches=22,
            traction=TractionType.ELECTRIC,
            direction=Direction.SOUTHBOUND,
            origin="Hyderabad Deccan",
            destination="Devgarh Central",
            scheduled_arrival="10:05",
            scheduled_departure="10:25",
            min_dwell_minutes=15,
            preferred_platform=3,
            assigned_platform=3,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1410,
            notes="Heavy passenger traffic from southern hub."
        ),
        Train(
            id="TR-11",
            train_number="12014",
            name="Amritsar Shatabdi",
            category=TrainCategory.VANDE_BHARAT,
            priority=1,
            length_coaches=16,
            traction=TractionType.ELECTRIC,
            direction=Direction.NORTHBOUND,
            origin="Devgarh Central",
            destination="Amritsar Junction",
            scheduled_arrival="10:20",
            scheduled_departure="10:40",
            min_dwell_minutes=15,
            preferred_platform=2,
            assigned_platform=2,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1100,
            notes="High priority turnaround service."
        ),
        Train(
            id="TR-12",
            train_number="14206",
            name="Ayodhya Dham Express",
            category=TrainCategory.EXPRESS,
            priority=3,
            length_coaches=20,
            traction=TractionType.ELECTRIC,
            direction=Direction.SOUTHBOUND,
            origin="Devgarh Central",
            destination="Ayodhya Cantt",
            scheduled_arrival="10:30",
            scheduled_departure="10:55",
            min_dwell_minutes=18,
            preferred_platform=4,
            assigned_platform=4,
            status=TrainStatus.SCHEDULED,
            inbound_delay_minutes=0,
            passenger_load=1320,
            notes="Pilgrim corridor special express service."
        )
    ]

def get_benchmark_scenarios() -> List[Scenario]:
    station = get_default_station()
    base_trains = get_default_trains()
    
    # Benchmark 1: Platform 2 Rail Fracture Closure
    sc_p2_closure_trains = [t.model_copy(deep=True) for t in base_trains]
    sc_p2_closure = Scenario(
        id="BENCHMARK-P2-CLOSURE",
        name="Platform 2 Emergency Rail Fracture (Blockade)",
        description="Platform 2 undergoes emergency welding from 08:00 to 10:30. Rajdhani Express (12951), Brahmaputra Mail (14055), and Amritsar Shatabdi (12014) lose their primary platform, creating severe platform bottlenecks.",
        station=station,
        trains=sc_p2_closure_trains,
        closures=[
            PlatformClosure(
                id="CL-P2-01",
                platform_number=2,
                start_time="08:00",
                end_time="10:30",
                reason="Track fracture detected by ultrasound vehicle; ultrasonic joint welding underway.",
                active=True
            )
        ],
        disruptions=[],
        is_benchmark=True
    )

    # Benchmark 2: Cascading Express Fog Delays
    sc_fog_trains = [t.model_copy(deep=True) for t in base_trains]
    # Apply delays
    for t in sc_fog_trains:
        if t.train_number == "22436":  # Vande Bharat
            t.inbound_delay_minutes = 35
            t.status = TrainStatus.DELAYED
        elif t.train_number == "12951":  # Rajdhani
            t.inbound_delay_minutes = 20
            t.status = TrainStatus.DELAYED
        elif t.train_number == "12424":  # Duronto
            t.inbound_delay_minutes = 45
            t.status = TrainStatus.DELAYED
            
    sc_fog = Scenario(
        id="BENCHMARK-FOG-CASCADE",
        name="Cascading Fog Inbound Wave (Triple Overlap)",
        description="Dense winter fog delays Vande Bharat (+35m), Rajdhani (+20m), and Duronto (+45m). Their delayed windows directly crash into scheduled slots of Shatabdi, Brahmaputra Mail, and Taj Intercity.",
        station=station,
        trains=sc_fog_trains,
        closures=[],
        disruptions=[],
        is_benchmark=True
    )

    # Benchmark 3: Compound Disruption (PF 1 & PF 3 OHE Wire Snap + Delays)
    sc_ohe_trains = [t.model_copy(deep=True) for t in base_trains]
    for t in sc_ohe_trains:
        if t.train_number == "14055":
            t.inbound_delay_minutes = 25
            t.status = TrainStatus.DELAYED
        elif t.train_number == "12616":
            t.inbound_delay_minutes = 40
            t.status = TrainStatus.DELAYED

    sc_compound = Scenario(
        id="BENCHMARK-COMPOUND-OHE",
        name="Severe Overhead Catenary (OHE) Wire Snap on PF 1",
        description="High-voltage catenary snap blocks Platform 1 from 08:15 to 10:00 while two inbound heavy express trains run 25-40 mins late. Tests algorithm's capacity to reroute long 24-coach rakes to Loop Platforms without violating safety headways.",
        station=station,
        trains=sc_ohe_trains,
        closures=[
            PlatformClosure(
                id="CL-P1-01",
                platform_number=1,
                start_time="08:15",
                end_time="10:00",
                reason="Overhead wire pantograph entangling incident; traction power cut for restoration.",
                active=True
            )
        ],
        disruptions=[],
        is_benchmark=True
    )

    # Benchmark 4: Standard Nominal Operations
    sc_nominal = Scenario(
        id="BENCHMARK-NOMINAL",
        name="Nominal Morning Master Timetable",
        description="Standard dispute-free operational timetable with all 6 platforms active and fully separated safety buffers.",
        station=station,
        trains=[t.model_copy(deep=True) for t in base_trains],
        closures=[],
        disruptions=[],
        is_benchmark=True
    )

    return [sc_nominal, sc_p2_closure, sc_fog, sc_compound]
