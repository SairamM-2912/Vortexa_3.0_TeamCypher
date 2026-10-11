import subprocess
import sys
import os
import time

PYTHON_PATH = sys.executable
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

def main():
    print("=" * 60)
    print("  RAILFLOW — Railway Disruption & Platform Conflict Simulator")
    print("=" * 60)
    print(f"Backend directory:  {BACKEND_DIR}")
    print(f"Frontend directory: {FRONTEND_DIR}")
    print("Starting backend (FastAPI + OR-Tools on http://127.0.0.1:8000)...")
    
    backend_proc = subprocess.Popen(
        [PYTHON_PATH, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR
    )

    print("Starting frontend (Vite on http://localhost:5173)...")
    frontend_proc = subprocess.Popen(
        ["npm.cmd", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"],
        cwd=FRONTEND_DIR,
        shell=True
    )

    print("\nRailFlow is LIVE!")
    print(">> Open your browser at: http://localhost:5173")
    print(">> API Documentation at:  http://127.0.0.1:8000/docs")
    print("Press Ctrl+C to stop both servers.")

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping RailFlow servers...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
