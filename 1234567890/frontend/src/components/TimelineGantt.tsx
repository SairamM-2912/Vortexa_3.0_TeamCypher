import React from 'react';
import { Station, Train, PlatformClosure } from '../types/railway';
import { Clock, AlertCircle } from 'lucide-react';

interface TimelineGanttProps {
  station: Station;
  trains: Train[];
  closures: PlatformClosure[];
  currentTimeStr: string;
  onTimeChange: (timeStr: string) => void;
  onTrainSelect: (train: Train) => void;
  selectedTrainId?: string;
  showOriginalOverlay?: boolean;
  theme?: 'light' | 'dark';
}

export const TimelineGantt: React.FC<TimelineGanttProps> = ({
  station,
  trains,
  closures,
  currentTimeStr,
  onTimeChange,
  onTrainSelect,
  selectedTrainId,
  theme = 'light',
}) => {
  const isLight = theme === 'light';
  const startMinutes = 450; // 07:30
  const endMinutes = 690;   // 11:30
  const totalMinutes = endMinutes - startMinutes;

  const timeToMinutes = (t: string) => {
    try {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    } catch {
      return 0;
    }
  };

  const minutesToTime = (m: number) => {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getPositionPercent = (m: number) => {
    const clamped = Math.max(startMinutes, Math.min(endMinutes, m));
    return ((clamped - startMinutes) / totalMinutes) * 100;
  };

  const getWidthPercent = (startM: number, endM: number) => {
    const s = Math.max(startMinutes, Math.min(endMinutes, startM));
    const e = Math.max(startMinutes, Math.min(endMinutes, endM));
    return Math.max(1.8, ((e - s) / totalMinutes) * 100);
  };

  const detectConflicts = (platformNum: number) => {
    const platformTrains = trains
      .filter((t) => t.assigned_platform === platformNum)
      .map((t) => ({
        train: t,
        arr: timeToMinutes(t.actual_arrival || t.scheduled_arrival),
        dep: timeToMinutes(t.actual_departure || t.scheduled_departure),
      }))
      .sort((a, b) => a.arr - b.arr);

    const conflicts: Array<{ train1: Train; train2: Train; isOverlap: boolean; gap: number }> = [];

    for (let i = 0; i < platformTrains.length - 1; i++) {
      const curr = platformTrains[i];
      const next = platformTrains[i + 1];

      if (next.arr < curr.dep) {
        conflicts.push({ train1: curr.train, train2: next.train, isOverlap: true, gap: next.arr - curr.dep });
      } else if (next.arr - curr.dep < station.min_headway_buffer_minutes) {
        conflicts.push({ train1: curr.train, train2: next.train, isOverlap: false, gap: next.arr - curr.dep });
      }
    }
    return conflicts;
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'VANDE_BHARAT': return isLight ? 'bg-[#1F4E9E] border-[#13305C] text-white' : 'bg-cyan-600 border-cyan-400 text-white';
      case 'RAJDHANI': return isLight ? 'bg-[#C9352B] border-[#8B1E17] text-white' : 'bg-rose-600 border-rose-400 text-white';
      case 'SUPERFAST': return isLight ? 'bg-[#E08A1E] border-[#B3680D] text-white' : 'bg-amber-600 border-amber-400 text-white';
      case 'EXPRESS': return isLight ? 'bg-[#2B5EA7] border-[#193F75] text-white' : 'bg-blue-600 border-blue-400 text-white';
      case 'PASSENGER': return isLight ? 'bg-[#2B7A78] border-[#1A504E] text-white' : 'bg-purple-600 border-purple-400 text-white';
      case 'FREIGHT': return isLight ? 'bg-[#3B4D61] border-[#1E2833] text-white' : 'bg-emerald-600 border-emerald-400 text-white';
      default: return 'bg-slate-600 border-slate-500 text-white';
    }
  };

  const timeMarkers: number[] = [];
  for (let m = startMinutes; m <= endMinutes; m += 15) {
    timeMarkers.push(m);
  }

  const currentMinutesVal = timeToMinutes(currentTimeStr);

  return (
    <div className="glass-panel p-4 shadow-xl">
      {/* Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#1F4E9E] dark:text-cyan-400" />
          <h2 className="font-bold text-base tracking-wide text-[var(--ink)]">
            Platform Occupancy Timeline & Headway Clearance
          </h2>
        </div>

        {/* Time Scrubber Slider */}
        <div className="flex items-center gap-3 bg-white/70 dark:bg-slate-800/80 px-4 py-1.5 rounded-lg border border-[var(--line)] shadow-sm">
          <span className="text-xs text-[var(--ink-soft)] font-mono font-medium">SCRUBBER:</span>
          <input
            type="range"
            min={startMinutes}
            max={endMinutes}
            step={5}
            value={currentMinutesVal}
            onChange={(e) => onTimeChange(minutesToTime(Number(e.target.value)))}
            className="w-48 accent-[#1F4E9E] dark:accent-cyan-400 cursor-pointer"
          />
          <span className="text-sm font-bold font-mono text-[#1F4E9E] dark:text-cyan-300 w-14 text-center">
            {currentTimeStr}
          </span>
        </div>

        {/* Category Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-soft)] font-medium">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#1F4E9E]"></span>Vande Bharat</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#C9352B]"></span>Rajdhani</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#E08A1E]"></span>Superfast</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#2B5EA7]"></span>Express</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#3B4D61]"></span>Freight</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-700"></span>Closure</div>
        </div>
      </div>

      {/* Main Gantt Grid */}
      <div className="relative overflow-x-auto select-none">
        <div className="min-w-[850px]">
          {/* Time Header Scale */}
          <div className="flex ml-28 border-b border-[var(--line)] pb-2 relative h-8">
            {timeMarkers.map((m) => {
              const leftPercent = getPositionPercent(m);
              const isHour = m % 60 === 0;
              return (
                <div
                  key={m}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  <span
                    className={`text-[10px] font-mono ${
                      isHour ? 'text-[#13305C] dark:text-cyan-400 font-bold text-xs' : 'text-[var(--ink-soft)]'
                    }`}
                  >
                    {minutesToTime(m)}
                  </span>
                  <div className={`w-0.5 ${isHour ? 'h-2.5 bg-[#13305C]/40 dark:bg-slate-500' : 'h-1.5 bg-[var(--line)]'}`}></div>
                </div>
              );
            })}
          </div>

          {/* Platform Rows */}
          <div className="relative mt-2 space-y-3">
            {/* Live Playhead Marker Line */}
            {currentMinutesVal >= startMinutes && currentMinutesVal <= endMinutes && (
              <div
                className="absolute top-0 bottom-0 z-30 w-0.5 bg-[#1F4E9E] dark:bg-cyan-400 shadow-[0_0_8px_rgba(31,78,158,0.5)] pointer-events-none transition-all duration-150"
                style={{ left: `calc(7rem + ${getPositionPercent(currentMinutesVal)}% * (1 - 7rem / 100%))` }}
              >
                <div className="w-2.5 h-2.5 bg-[#1F4E9E] dark:bg-cyan-400 rounded-full -translate-x-[4px] -translate-y-1 shadow"></div>
              </div>
            )}

            {station.platforms.map((platform) => {
              const platformConflicts = detectConflicts(platform.number);
              const platformClosures = closures.filter((c) => c.active && c.platform_number === platform.number);
              const platformTrains = trains.filter((t) => t.assigned_platform === platform.number);

              return (
                <div key={platform.id} className="flex items-center group">
                  {/* Platform Header */}
                  <div className="w-28 shrink-0 pr-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--ink)]">PF {platform.number}</span>
                      <span className="text-[10px] text-[var(--ink-soft)] font-mono">{platform.length_coaches}C</span>
                    </div>
                    <div className="text-[10px] text-[var(--ink-soft)] truncate">
                      {platform.line_type} &bull; {platform.electrified ? '25kV' : 'Diesel'}
                    </div>
                  </div>

                  {/* Track Timeline Lane */}
                  <div className="relative flex-1 h-14 bg-white/35 dark:bg-slate-900/40 border border-[var(--line)] rounded-lg overflow-hidden backdrop-blur-[2px]">
                    {/* Time Grid Lines */}
                    {timeMarkers.map((m) => (
                      <div
                        key={m}
                        className={`absolute top-0 bottom-0 border-r ${
                          m % 60 === 0 ? 'border-[var(--line-strong)]' : 'border-[var(--line)]/50'
                        }`}
                        style={{ left: `${getPositionPercent(m)}%` }}
                      />
                    ))}

                    {/* PLATFORM CLOSURES */}
                    {platformClosures.map((closure) => {
                      const s = timeToMinutes(closure.start_time);
                      const e = timeToMinutes(closure.end_time);
                      const left = getPositionPercent(s);
                      const width = getWidthPercent(s, e);

                      return (
                        <div
                          key={closure.id}
                          className="absolute top-1 bottom-1 z-10 rounded border-2 border-rose-600 bg-rose-950/85 p-1 flex items-center justify-center text-center overflow-hidden cursor-help shadow-lg"
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`CLOSED: ${closure.reason} (${closure.start_time} - ${closure.end_time})`}
                        >
                          <div className="text-[10px] font-bold text-white truncate flex items-center gap-1 font-['Barlow_Condensed']">
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                            TRACK BLOCKED ({closure.start_time} - {closure.end_time})
                          </div>
                        </div>
                      );
                    })}

                    {/* TRAIN OCCUPANCY BLOCKS */}
                    {platformTrains.map((train) => {
                      const arrM = timeToMinutes(train.actual_arrival || train.scheduled_arrival);
                      const depM = timeToMinutes(train.actual_departure || train.scheduled_departure);
                      const left = getPositionPercent(arrM);
                      const width = getWidthPercent(arrM, depM);

                      const bufferWidth = getWidthPercent(depM, depM + station.min_headway_buffer_minutes);
                      const isSelected = selectedTrainId === train.id;

                      return (
                        <React.Fragment key={train.id}>
                          {/* Safety Buffer Margin */}
                          <div
                            className="absolute top-2 bottom-2 z-0 bg-amber-400/25 border-r-2 border-dashed border-amber-500 rounded-r"
                            style={{
                              left: `${left + width}%`,
                              width: `${bufferWidth}%`,
                            }}
                            title={`Safety Buffer Gap (+${station.min_headway_buffer_minutes}m)`}
                          />

                          {/* Train Box */}
                          <div
                            onClick={() => onTrainSelect(train)}
                            className={`absolute top-1 bottom-1 z-10 rounded-md border p-1.5 cursor-pointer shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                              getCategoryColor(train.category)
                            } ${
                              isSelected
                                ? 'ring-2 ring-white dark:ring-cyan-300 scale-[1.02] shadow-xl z-20'
                                : 'hover:scale-[1.01] hover:brightness-105'
                            }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <div className="flex items-center justify-between gap-1 text-[11px] font-bold leading-tight truncate">
                              <span className="truncate">{train.train_number} {train.name}</span>
                              <span className="text-[9px] px-1 py-0.2 bg-black/40 rounded font-mono shrink-0">
                                P{train.priority}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[9px] opacity-95 font-mono">
                              <span>{train.actual_arrival || train.scheduled_arrival}</span>
                              <span className="text-[8px] opacity-85">{train.length_coaches}C</span>
                              <span>{train.actual_departure || train.scheduled_departure}</span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* CONFLICT WARNING */}
                    {platformConflicts.length > 0 && (
                      <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5 bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg animate-bounce">
                        <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" />
                        <span>
                          {platformConflicts[0].isOverlap ? 'COLLISION CONFLICT' : 'HEADWAY BUFFER VIOLATION'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
