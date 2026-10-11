import { Station, Train, PlatformClosure, ReplanResponse, ValidationResult, Scenario } from '../types/railway';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getStation(): Promise<Station> {
    const res = await fetch(`${API_BASE}/station`);
    if (!res.ok) throw new Error('Failed to fetch station');
    return res.json();
  },

  async getTrains(): Promise<Train[]> {
    const res = await fetch(`${API_BASE}/trains`);
    if (!res.ok) throw new Error('Failed to fetch trains');
    return res.json();
  },

  async validate(station: Station, trains: Train[], closures: PlatformClosure[]): Promise<ValidationResult> {
    const res = await fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station, trains, closures }),
    });
    if (!res.ok) throw new Error('Validation request failed');
    return res.json();
  },

  async replan(station: Station, trains: Train[], closures: PlatformClosure[], weights?: Record<string, number>): Promise<ReplanResponse> {
    const res = await fetch(`${API_BASE}/replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station, trains, closures, objective_weights: weights }),
    });
    if (!res.ok) throw new Error('Replanning request failed');
    return res.json();
  },

  async parseDisruptionText(text: string) {
    const res = await fetch(`${API_BASE}/disruption/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('NLP parsing failed');
    return res.json();
  },

  async getScenarios(): Promise<Array<{ id: string; name: string; description: string; is_benchmark: boolean; created_at: string }>> {
    const res = await fetch(`${API_BASE}/scenarios`);
    if (!res.ok) throw new Error('Failed to list scenarios');
    return res.json();
  },

  async getScenarioById(id: string): Promise<Scenario> {
    const res = await fetch(`${API_BASE}/scenarios/${id}`);
    if (!res.ok) throw new Error(`Failed to load scenario ${id}`);
    return res.json();
  },

  async saveScenario(scenario: Scenario) {
    const res = await fetch(`${API_BASE}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    });
    if (!res.ok) throw new Error('Failed to save scenario');
    return res.json();
  },

  async deleteScenario(id: string) {
    const res = await fetch(`${API_BASE}/scenarios/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete scenario');
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  }
};
