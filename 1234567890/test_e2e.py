import urllib.request
import json

def test():
    # 1. Health
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as resp:
        health = json.loads(resp.read().decode())
        print("Health check:", health)

    # 2. NLP Parse
    payload = json.dumps({
        "text": "Train 12002 is delayed by 35 mins due to signal failure. Also Platform 2 is closed from 08:30 to 10:30 for maintenance."
    }).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/disruption/parse", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        nlp_res = json.loads(resp.read().decode())
        print("NLP Parse Result:", nlp_res["explanation"])
        for evt in nlp_res["extracted_events"]:
            print("  Extracted:", evt["type"], evt["description"])

    # 3. Load Scenario and Replan
    with urllib.request.urlopen("http://127.0.0.1:8000/api/scenarios/BENCHMARK-P2-CLOSURE") as resp:
        sc = json.loads(resp.read().decode())
        print("Loaded Scenario:", sc["name"])
        
        replan_req = json.dumps({
            "station": sc["station"],
            "trains": sc["trains"],
            "closures": sc["closures"]
        }).encode("utf-8")
        req2 = urllib.request.Request("http://127.0.0.1:8000/api/replan", data=replan_req, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req2) as resp2:
            replan_res = json.loads(resp2.read().decode())
            print("Replan Summary:", replan_res["summary_message"])
            print("Solver Used:", replan_res["solver_used"], f"({replan_res['solver_time_ms']:.1f}ms)")
            print("Safety Score:", replan_res["validation"]["safety_compliance_score"])
            print("Explanations count:", len(replan_res["explanations"]))

if __name__ == "__main__":
    test()
