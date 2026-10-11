import React, { useState } from 'react';
import { Train } from '../types/railway';
import { Clock, Filter, Edit2, Check, X } from 'lucide-react';

interface TimetableTableProps {
  trains: Train[];
  onSelectTrain: (train: Train) => void;
  onUpdateTrain: (train: Train) => void;
  selectedTrainId?: string;
}

export const TimetableTable: React.FC<TimetableTableProps> = ({
  trains,
  onSelectTrain,
  onUpdateTrain,
  selectedTrainId,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [editingTrainId, setEditingTrainId] = useState<string | null>(null);
  const [editPlatform, setEditPlatform] = useState<number>(1);

  const filteredTrains = trains.filter((t) => {
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
    if (filterStatus === 'DELAYED' && t.delay_departure_minutes === 0 && t.inbound_delay_minutes === 0) return false;
    if (filterStatus === 'REPLATFORMED' && t.assigned_platform === (t.preferred_platform || t.assigned_platform)) return false;
    return true;
  });

  const getPriorityBadge = (p: number) => {
    switch (p) {
      case 1:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">P1 (Highest)</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">P2 (Premium)</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">P3 (Express)</span>;
      case 4:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">P4 (Regional)</span>;
      case 5:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">P5 (Freight)</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (t: Train) => {
    const isReplatformed = t.assigned_platform !== (t.preferred_platform || t.assigned_platform);
    const hasDelay = (t.delay_departure_minutes > 0 || t.inbound_delay_minutes > 0);

    if (isReplatformed && hasDelay) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
          REPLATFORMED + DELAYED
        </span>
      );
    }
    if (isReplatformed) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
          REPLATFORMED
        </span>
      );
    }
    if (hasDelay) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
          DELAYED (+{t.delay_departure_minutes || t.inbound_delay_minutes}m)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
        ON-TIME SCHEDULED
      </span>
    );
  };

  const handleStartEdit = (t: Train) => {
    setEditingTrainId(t.id);
    setEditPlatform(t.assigned_platform || 1);
  };

  const handleSaveEdit = (t: Train) => {
    const updated = {
      ...t,
      assigned_platform: editPlatform,
      status: (editPlatform !== t.preferred_platform ? 'REPLATFORMED' : t.status) as any,
    };
    onUpdateTrain(updated);
    setEditingTrainId(null);
  };

  return (
    <div className="glass-panel p-4 shadow-xl">
      {/* Table Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#1F4E9E] dark:text-cyan-400" />
          <div>
            <h3 className="font-bold text-[var(--ink)] text-base tracking-wide">
              Master Train Timetable & Platform Allocations
            </h3>
            <p className="text-xs text-[var(--ink-soft)]">
              {trains.length} total services &bull; {filteredTrains.length} shown
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white/70 dark:bg-slate-800 px-2 py-1 rounded-lg border border-[var(--line)] shadow-sm">
            <Filter className="w-3.5 h-3.5 text-[var(--ink-soft)]" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-[var(--ink)] focus:outline-none font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="VANDE_BHARAT">Vande Bharat</option>
              <option value="RAJDHANI">Rajdhani</option>
              <option value="SUPERFAST">Superfast</option>
              <option value="EXPRESS">Express</option>
              <option value="PASSENGER">Passenger</option>
              <option value="FREIGHT">Freight</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white/70 dark:bg-slate-800 px-2 py-1 rounded-lg border border-[var(--line)] shadow-sm">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-[var(--ink)] focus:outline-none font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="DELAYED">Delayed Only</option>
              <option value="REPLATFORMED">Replatformed Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[var(--ink)]">
          <thead className="bg-[#13305C]/5 dark:bg-slate-900/90 text-[var(--ink-soft)] font-['Barlow_Condensed'] text-xs font-bold uppercase tracking-wider border-b border-[var(--line)]">
            <tr>
              <th className="py-2.5 px-3">Train</th>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3">Formation</th>
              <th className="py-2.5 px-3">Corridor</th>
              <th className="py-2.5 px-3">Sched (Arr-Dep)</th>
              <th className="py-2.5 px-3">Actual (Arr-Dep)</th>
              <th className="py-2.5 px-3">Platform</th>
              <th className="py-2.5 px-3">Delay Delta</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)] font-sans">
            {filteredTrains.map((t) => {
              const isSelected = selectedTrainId === t.id;
              const isEditing = editingTrainId === t.id;
              const isReplatformed = t.assigned_platform !== (t.preferred_platform || t.assigned_platform);

              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTrain(t)}
                  className={`hover:bg-[#1F4E9E]/5 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#1F4E9E]/10 dark:bg-blue-950/40 border-l-4 border-[#1F4E9E]' : ''
                  }`}
                >
                  {/* Train Identity */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <span className="font-mono text-[#1F4E9E] dark:text-cyan-400 font-bold">{t.train_number}</span>
                      <span className="truncate max-w-[130px] font-['Barlow']">{t.name}</span>
                    </div>
                    <span className="text-[10px] text-[var(--ink-soft)] font-mono">{t.category}</span>
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-3">
                    {getPriorityBadge(t.priority)}
                  </td>

                  {/* Formation & Traction */}
                  <td className="py-3 px-3">
                    <div className="font-mono font-medium">{t.length_coaches} Coaches</div>
                    <div className="text-[10px] text-[var(--ink-soft)]">{t.traction} &bull; {t.direction}</div>
                  </td>

                  {/* Route */}
                  <td className="py-3 px-3">
                    <div className="truncate max-w-[140px] font-medium">{t.origin}</div>
                    <div className="text-[10px] text-[var(--ink-soft)] truncate max-w-[140px]">&rarr; {t.destination}</div>
                  </td>

                  {/* Sched Times */}
                  <td className="py-3 px-3 font-mono">
                    <span>{t.scheduled_arrival}</span>
                    <span className="text-[var(--ink-soft)] mx-1">&rarr;</span>
                    <span>{t.scheduled_departure}</span>
                    <div className="text-[10px] text-[var(--ink-soft)]">Dwell: {t.min_dwell_minutes}m</div>
                  </td>

                  {/* Actual Times */}
                  <td className="py-3 px-3 font-mono font-bold text-[#1F4E9E] dark:text-cyan-300">
                    <span>{t.actual_arrival || t.scheduled_arrival}</span>
                    <span className="text-[var(--ink-soft)] mx-1 font-normal">&rarr;</span>
                    <span>{t.actual_departure || t.scheduled_departure}</span>
                  </td>

                  {/* Platform */}
                  <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editPlatform}
                          onChange={(e) => setEditPlatform(Number(e.target.value))}
                          className="bg-white dark:bg-slate-900 border border-[#1F4E9E] rounded p-1 text-xs text-[var(--ink)]"
                        >
                          {[1, 2, 3, 4, 5, 6].map((p) => (
                            <option key={p} value={p}>PF {p}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveEdit(t)}
                          className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingTrainId(null)}
                          className="p-1 rounded bg-slate-300 hover:bg-slate-400 text-slate-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                          isReplatformed 
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 border border-purple-300 dark:border-purple-500' 
                            : 'bg-white/80 dark:bg-slate-800 text-[#1F4E9E] dark:text-cyan-300 border border-[var(--line)]'
                        }`}>
                          Platform {t.assigned_platform}
                        </span>
                        {isReplatformed && (
                          <span className="text-[10px] text-amber-600 line-through font-bold" title="Preferred platform">
                            PF{t.preferred_platform}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Delay */}
                  <td className="py-3 px-3 font-mono">
                    {t.delay_departure_minutes > 0 ? (
                      <span className="text-rose-600 font-bold">+{t.delay_departure_minutes}m</span>
                    ) : t.inbound_delay_minutes > 0 ? (
                      <span className="text-amber-600 font-bold">+{t.inbound_delay_minutes}m arr</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">0m (On-Time)</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    {getStatusBadge(t)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleStartEdit(t)}
                      title="Manually reassign platform"
                      className="p-1.5 hover:bg-[#1F4E9E]/10 rounded text-[var(--ink-soft)] hover:text-[#1F4E9E] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
