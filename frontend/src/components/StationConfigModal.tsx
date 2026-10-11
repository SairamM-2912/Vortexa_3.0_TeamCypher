import React, { useState } from 'react';
import { Station, Platform, LineType, Direction } from '../types/railway';
import { Settings, X, Save, Zap } from 'lucide-react';

interface StationConfigModalProps {
  station: Station;
  isOpen: boolean;
  onClose: () => void;
  onSaveStation: (updatedStation: Station) => void;
}

export const StationConfigModal: React.FC<StationConfigModalProps> = ({
  station,
  isOpen,
  onClose,
  onSaveStation,
}) => {
  const [editedStation, setEditedStation] = useState<Station>({ ...station });

  if (!isOpen) return null;

  const handleUpdatePlatform = (index: number, field: keyof Platform, value: any) => {
    const newPlatforms = [...editedStation.platforms];
    newPlatforms[index] = { ...newPlatforms[index], [field]: value };
    setEditedStation({ ...editedStation, platforms: newPlatforms });
  };

  const handleSave = () => {
    onSaveStation(editedStation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#0F172A] border border-[var(--line)] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1F4E9E]/10 text-[#1F4E9E] rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">
                Station & Platform Infrastructure Configuration
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                Define platform lengths, electrification catenary, line types, and safety separation buffers
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--ink-soft)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[var(--ink)]">
          {/* Station Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#1F4E9E]/5 dark:bg-slate-900/60 p-4 rounded-xl border border-[var(--line)]">
            <div>
              <label className="text-[var(--ink-soft)] block mb-1 font-medium">Station Name:</label>
              <input
                type="text"
                value={editedStation.name}
                onChange={(e) => setEditedStation({ ...editedStation, name: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-[var(--line)] rounded p-2 text-[var(--ink)] font-bold shadow-sm"
              />
            </div>
            <div>
              <label className="text-[var(--ink-soft)] block mb-1 font-medium">Station Code:</label>
              <input
                type="text"
                value={editedStation.code}
                onChange={(e) => setEditedStation({ ...editedStation, code: e.target.value.toUpperCase() })}
                className="w-full bg-white dark:bg-slate-800 border border-[var(--line)] rounded p-2 text-[#1F4E9E] font-mono font-bold shadow-sm"
              />
            </div>
            <div>
              <label className="text-[var(--ink-soft)] block mb-1 font-medium">Min Safety Buffer Gap (Mins):</label>
              <input
                type="number"
                min={5}
                max={30}
                value={editedStation.min_headway_buffer_minutes}
                onChange={(e) => setEditedStation({ ...editedStation, min_headway_buffer_minutes: Number(e.target.value) })}
                className="w-full bg-white dark:bg-slate-800 border border-[var(--line)] rounded p-2 text-amber-600 font-mono font-bold shadow-sm"
              />
            </div>
          </div>

          {/* Platforms List */}
          <div className="space-y-3">
            <h4 className="font-['Barlow_Condensed'] text-xs text-[var(--ink-soft)] uppercase tracking-wider font-bold">
              PLATFORM SPECIFICATIONS & CAPACITIES:
            </h4>

            <div className="space-y-3">
              {editedStation.platforms.map((pf, idx) => (
                <div key={pf.id} className="p-3.5 bg-white dark:bg-slate-900 border border-[var(--line)] rounded-xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1F4E9E] font-mono">Platform {pf.number}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pf.electrified}
                        onChange={(e) => handleUpdatePlatform(idx, 'electrified', e.target.checked)}
                        className="rounded accent-[#1F4E9E]"
                      />
                      <span className="text-xs text-[var(--ink)] flex items-center gap-1 font-medium">
                        <Zap className="w-3.5 h-3.5 text-[#1F4E9E]" /> 25kV Electrified Catenary
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--ink-soft)] block text-[10px] font-medium">Length Capacity (Coaches):</span>
                      <input
                        type="number"
                        min={8}
                        max={30}
                        value={pf.length_coaches}
                        onChange={(e) => handleUpdatePlatform(idx, 'length_coaches', Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--line)] rounded p-1.5 font-mono text-[var(--ink)]"
                      />
                    </div>

                    <div>
                      <span className="text-[var(--ink-soft)] block text-[10px] font-medium">Line Type:</span>
                      <select
                        value={pf.line_type}
                        onChange={(e) => handleUpdatePlatform(idx, 'line_type', e.target.value as LineType)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--line)] rounded p-1.5 text-[var(--ink)]"
                      >
                        <option value="MAIN">Main Line</option>
                        <option value="LOOP">Loop Line</option>
                        <option value="TERMINAL">Terminal Bay</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[var(--ink-soft)] block text-[10px] font-medium">Permitted Direction:</span>
                      <select
                        value={pf.direction_allowed}
                        onChange={(e) => handleUpdatePlatform(idx, 'direction_allowed', e.target.value as Direction)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--line)] rounded p-1.5 text-[var(--ink)]"
                      >
                        <option value="BIDIRECTIONAL">Bidirectional</option>
                        <option value="NORTHBOUND">Northbound Only</option>
                        <option value="SOUTHBOUND">Southbound Only</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[var(--ink-soft)] block text-[10px] font-medium">Speed Rating (km/h):</span>
                      <input
                        type="number"
                        value={pf.max_speed_kmh}
                        onChange={(e) => handleUpdatePlatform(idx, 'max_speed_kmh', Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--line)] rounded p-1.5 font-mono text-[var(--ink)]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-[var(--line)] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-[var(--ink)] font-bold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#1F4E9E] hover:bg-[#153a76] text-white font-bold rounded-lg transition-colors shadow"
          >
            <Save className="w-4 h-4" />
            Apply Station Infrastructure
          </button>
        </div>
      </div>
    </div>
  );
};
