# 🚆 RailFlow — Railway Disruption & Platform Conflict Simulator

**A deterministic railway platform scheduling and disruption management simulator.**

RailFlow is a decision-support and simulation platform designed to explore how railway stations can manage platform assignments and timetable disruptions. It identifies scheduling conflicts, generates revised timetable candidates, and independently validates them against configured constraints.

The project uses a fictional station environment and synthetic railway data to demonstrate railway operations research, constraint-based scheduling, disruption management, and explainable decision support.

> **Core Principle: AI Informs, Deterministic Math Decides.**

---

## 📌 Problem Statement

Railway stations must coordinate train arrivals, departures, platform occupancy, and timetable changes. Delays and platform closures can disrupt existing schedules and create conflicts between train movements.

Manually evaluating alternative assignments can be challenging when multiple trains compete for limited platform capacity.

RailFlow explores how a software-based simulation system can:

- Detect platform occupancy conflicts.
- Evaluate timetable disruptions.
- Generate alternative platform assignments.
- Enforce configured scheduling constraints.
- Independently validate revised timetable candidates.
- Compare original and revised schedules.
- Record scheduling changes and explain why they occurred.

## 💡 Proposed Solution

RailFlow provides a simulation environment in which users can configure a fictional station schedule, introduce disruptions, and evaluate alternative timetable arrangements.

Its backend separates deterministic scheduling from independent validation. An optional AI component can interpret natural-language disruption descriptions and explain the results, while the scheduling engine remains responsible for generating assignments.

### Key Features

- **Conflict Detection:** Identify overlapping platform occupancy and other configured scheduling violations.
- **Disruption Management:** Model train delays and temporary platform closures.
- **Deterministic Replanning:** Generate candidate timetables using defined scheduling rules.
- **Independent Validation:** Recheck candidate schedules before presenting them as validated.
- **Schedule Comparison:** Compare original and revised timetable assignments and calculated metrics.
- **Audit Trail:** Record simulation runs, disruptions, validation outcomes, and scheduling changes.
- **AI-Assisted Interaction:** Optionally convert free-text disruption descriptions into structured inputs and provide human-readable explanations.

Feature availability depends on the current implementation. Planned or partially implemented components should not be considered operational until tested.

## 🔄 System Workflow

1. **Configure:** Load a fictional station, platform configuration, train information, and an initial timetable.
2. **Observe:** Inspect existing assignments and identify scheduling conflicts.
3. **Introduce Disruption:** Submit a train delay or platform closure.
4. **Parse Input:** Optionally use AI to convert natural-language descriptions into structured disruption fields.
5. **Replan:** Run the deterministic scheduling engine to generate a candidate timetable.
6. **Validate:** Independently check the candidate against the configured constraints.
7. **Evaluate:** If validation passes, present the validated candidate. If validation fails, reject it and report the detected violations.
8. **Compare:** Review changes, delay impact, and other metrics calculated from the simulation results.
9. **Audit:** Retrieve the run history and reasons for scheduling changes.

## 🏗️ System Architecture

```text
              User / Frontend
                     |
                     v
              FastAPI Backend
                     |
                     v
           Request Validation
                     |
                     v
          Schedule & Disruption
                 Services
                     |
                     v
          Deterministic Scheduler
                     |
                     v
          Independent Validator
                 /       \
                /         \
             PASS         FAIL
              |             |
              v             v
       Persist Result    Reject Candidate
              |          Record Violations
              v             |
        Comparison & Audit  |
              |             |
              +------+------+
                     |
                     v
               API Response
                     |
                     v
              Frontend UI
```

The optional AI integration operates as an input-parsing and explanation layer. It does not directly determine platform assignments or bypass independent validation.

## 🧰 Technology Stack

| Component | Technology |
|---|---|
| Frontend | React and TypeScript, if used by the current client |
| Backend API | Python and FastAPI |
| Request/Response Validation | Pydantic |
| Database ORM | SQLAlchemy |
| Initial Database | SQLite |
| Optional Database | PostgreSQL |
| Scheduling Optimization | Deterministic baseline scheduler; OR-Tools CP-SAT as an optimization option |
| Testing | pytest |
| API Documentation | FastAPI Swagger UI |
| AI Integration | Optional LLM API adapter |

The final stack and feature list should reflect the dependencies actually present in the repository.

## 🧠 Scheduling and Validation

RailFlow treats configured scheduling constraints as hard requirements rather than trade-offs against punctuality.

Depending on the station model, these constraints may include:

- No overlapping occupancy on the same platform.
- Required minimum separation between consecutive occupancies.
- Valid arrival and departure intervals.
- Valid platform assignments and platform compatibility.
- No occupancy during a configured platform closure.

The independent validator checks the generated candidate separately from the scheduling process.

A candidate is not considered validated merely because the scheduler generated it. Solver outcomes such as `OPTIMAL`, `FEASIBLE`, `INFEASIBLE`, and `UNKNOWN` must be distinguished correctly.

## 📊 Evaluation and Metrics

RailFlow can be evaluated using reproducible synthetic scenarios, including:

- Baseline timetable without disruptions.
- Train delay affecting an existing assignment.
- Temporary platform closure.
- Multiple disruptions affecting several assignments.
- Scenarios where no feasible schedule can be found.

Potential metrics include:

- Number of detected scheduling conflicts.
- Number of changed train assignments.
- Total delay minutes and additional delay.
- Number of candidate schedules rejected during validation.
- Scheduling runtime and solver status.
- Validation outcomes and reasons for changes.

Metrics must be calculated from actual simulation runs. Benchmark values should only be published after the relevant experiments have been executed.

## 🧪 Synthetic Data and Reproducibility

RailFlow is designed to use fictional station configurations and synthetic train schedules.

Synthetic scenarios support repeatable experiments without depending on live railway operational data.

Test fixtures may be used in automated tests. They should not be confused with real execution results or presented as evidence of a successful simulation unless they have passed through the implemented workflow.

## 🎯 Intended Users

- Students and researchers studying railway operations research.
- Developers exploring constraint-based scheduling and optimization.
- Educators demonstrating timetable planning and disruption management.
- Hackathon judges and technical evaluators examining deterministic decision-support systems.

## 🌟 What Makes RailFlow Different?

RailFlow emphasizes a combination of:

- Constraint-based timetable replanning.
- Independent validation of proposed schedules.
- Traceable changes and reproducible disruption scenarios.
- Before-and-after comparison of scheduling outcomes.
- A separation between AI-assisted interpretation and deterministic scheduling decisions.

These are the project's design objectives. Comparative claims about existing railway systems require evidence and should not be interpreted as claims that no other system offers similar capabilities.

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or a compatible version supported by the project dependencies.
- Git.
- A frontend runtime such as Node.js if the frontend is included.
- A configured database supported by the current implementation.

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
```

Replace the placeholders with the actual repository URL and folder name.

### 2. Set Up the Backend

```bash
python -m venv .venv
```

Activate the environment.

**Windows PowerShell:**

```powershell
.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

### 3. Install Dependencies

If the backend provides a `requirements.txt` file:

```bash
pip install -r requirements.txt
```

If your repository uses another dependency manager, follow its existing setup instructions.

### 4. Configure Environment Variables

Create a local `.env` file if required by the application.

Example:

```env
DATABASE_URL=sqlite+aiosqlite:///./railflow.db
```

Use the exact connection format supported by your database configuration. Keep API keys and other secrets out of source control, and provide a sanitized `.env.example` file instead.

### 5. Start the Backend

For a FastAPI application whose entry point is `app.main:app`:

```bash
uvicorn app.main:app --reload
```

Adjust the module path if your repository uses a different entry point.

### 6. Open API Documentation

Once the server starts, visit:

- API documentation: `http://127.0.0.1:8000/docs`
- Alternative API documentation: `http://127.0.0.1:8000/redoc`
- Health check: `http://127.0.0.1:8000/health`, if implemented.

These endpoints depend on the actual backend configuration and available routes.

## 🧪 Running Tests

If pytest and the project tests are configured:

```bash
pytest
```

Important test cases include overlapping platform occupancy, minimum-gap enforcement, invalid assignments, disruption handling, infeasible scenarios, solver timeouts, and rejection of candidates that fail independent validation.

## 🔐 Safety and Scope Limitations

RailFlow is a research and educational simulation prototype.

- It uses fictional station scenarios and synthetic data.
- It is not connected to railway signalling, interlocking, or live dispatch systems.
- It is not intended to control real train movements.
- It is not certified for operational railway safety.
- A successful model validation establishes compliance only with the constraints explicitly represented in the model.
- Real railway deployment would require extensive domain validation, infrastructure integration, formal safety engineering, and applicable regulatory approvals.

## 🛣️ Future Scope

Potential future improvements include:

- Constraint optimization using OR-Tools CP-SAT.
- More detailed fictional station topology and shared-resource constraints.
- Advanced disruption scenarios involving multiple trains and platforms.
- Better schedule comparison and audit visualization.
- Reproducible performance benchmarks.
- Enhanced natural-language disruption parsing and explanations.
- Expanded automated tests and deployment support.

These are future enhancements unless already implemented and tested.

## 👥 Contributors

Add the names and GitHub profiles of the project contributors here.

- **Project:** RailFlow — Railway Disruption & Platform Conflict Simulator
- **Problem Statement:** P-03
- **Domain:** Public Systems & Civic Technology
- **Project Type:** Hackathon / Research Prototype

## 📄 License

Add a license before distributing or reusing the project. If no license has been selected, the repository remains subject to the applicable default copyright rules.

---

**RailFlow — Simulate disruptions. Replan deterministically. Validate independently.**
