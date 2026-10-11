import React, { useState } from 'react';
import { Scenario } from '../types/railway';
import { api } from '../services/api';
import { FolderOpen, Save, Download, Upload, Trash2, X, AlertCircle, PlayCircle } from 'lucide-react';

interface ScenarioManagerModalProps {
  currentScenario: Scenario;
  isOpen: boolean;
  onClose: () => void;
  onLoadScenario: (scenario: Scenario) => void;
}

export const ScenarioManagerModal: React.FC<ScenarioManagerModalProps> = ({
  currentScenario,
  isOpen,
  onClose,
  onLoadScenario,
}) => {
  const [scenariosList, setScenariosList] = useState<any[]>([]);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen]);

  const loadList = async () => {
    try {
      const data = await api.getScenarios();
      setScenariosList(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSaveCurrent = async () => {
    if (!newScenarioName.trim()) {
      setStatusMsg({ text: 'Please enter a scenario name', type: 'error' });
      return;
    }
    const toSave: Scenario = {
      ...currentScenario,
      id: `SCN-${Date.now()}`,
      name: newScenarioName.trim(),
      description: newScenarioDesc.trim() || 'User defined simulation scenario',
      is_benchmark: false,
    };
    try {
      await api.saveScenario(toSave);
      setStatusMsg({ text: `Scenario '${toSave.name}' saved to SQLite database.`, type: 'success' });
      setNewScenarioName('');
      setNewScenarioDesc('');
      loadList();
    } catch (err) {
      setStatusMsg({ text: 'Failed to save scenario.', type: 'error' });
    }
  };

  const handleSelectScenario = async (id: string) => {
    try {
      const scn = await api.getScenarioById(id);
      onLoadScenario(scn);
      onClose();
    } catch (err) {
      setStatusMsg({ text: 'Failed to load scenario.', type: 'error' });
    }
  };

  const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteScenario(id);
      loadList();
    } catch (err) {
      setStatusMsg({ text: 'Cannot delete benchmark scenarios.', type: 'error' });
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentScenario, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `railflow_${currentScenario.id || 'scenario'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.station && parsed.trains) {
          onLoadScenario(parsed);
          onClose();
        } else {
          setStatusMsg({ text: 'Invalid RailFlow JSON structure.', type: 'error' });
        }
      } catch (err) {
        setStatusMsg({ text: 'Failed to parse JSON file.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#0F172A] border border-[var(--line)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#1F4E9E] dark:text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">
                Scenario Repository & Data Exchange
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                Persistent SQLite scenarios, benchmark presets, JSON export & import
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--ink-soft)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[var(--ink)]">
          {statusMsg && (
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${
              statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Save Current Section */}
          <div className="bg-[#1F4E9E]/5 dark:bg-slate-900/80 p-4 rounded-xl border border-[var(--line)] space-y-3">
            <h4 className="font-bold text-[var(--ink)] flex items-center gap-1.5 text-xs">
              <Save className="w-4 h-4 text-[#1F4E9E] dark:text-cyan-400" />
              Save Active Simulation as New Scenario
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Scenario Name (e.g. Evening Peak Rush With Blockade)"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-[var(--line)] rounded p-2 text-[var(--ink)] text-xs focus:outline-none focus:border-[#1F4E9E] shadow-sm"
              />
              <input
                type="text"
                placeholder="Description of disruptions and conditions"
                value={newScenarioDesc}
                onChange={(e) => setNewScenarioDesc(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-[var(--line)] rounded p-2 text-[var(--ink)] text-xs focus:outline-none focus:border-[#1F4E9E] shadow-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSaveCurrent}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm"
              >
                <Save className="w-3.5 h-3.5 text-white" />
                Save Scenario
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJSON}
                  className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-[#1F4E9E]" /> Export JSON
                </button>

                <label className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#1F4E9E]" /> Import JSON
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Saved Scenarios List */}
          <div className="space-y-2">
            <h4 className="font-['Barlow_Condensed'] text-xs text-[var(--ink-soft)] uppercase tracking-wider font-bold">
              DATABASE SCENARIOS & BENCHMARKS:
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scenariosList.map((scn) => (
                <div
                  key={scn.id}
                  onClick={() => handleSelectScenario(scn.id)}
                  className="p-3 bg-white dark:bg-slate-900 border border-[var(--line)] hover:border-[#1F4E9E]/60 rounded-xl cursor-pointer flex items-center justify-between transition-colors group shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--ink)] text-xs">{scn.name}</span>
                      {scn.is_benchmark ? (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[9px] border border-indigo-200 dark:border-indigo-700 font-bold">
                          BENCHMARK
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-mono text-[9px]">
                          USER SCENARIO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--ink-soft)] mt-0.5 line-clamp-1">{scn.description}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      title="Load Scenario"
                      className="p-1.5 rounded-lg bg-[#1F4E9E]/15 text-[#1F4E9E] group-hover:bg-[#1F4E9E] group-hover:text-white transition-colors"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>
                    {!scn.is_benchmark && (
                      <button
                        onClick={(e) => handleDeleteScenario(scn.id, e)}
                        title="Delete Scenario"
                        className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
