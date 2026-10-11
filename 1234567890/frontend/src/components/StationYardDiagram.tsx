import React, { useState } from 'react';
import { Station, Train, PlatformClosure, Platform } from '../types/railway';
import { ShieldAlert, Zap, AlertTriangle, Clock, Users, ArrowRight, Train as TrainIcon, Ban } from 'lucide-react';

interface StationYardDiagramProps {
  station: Station;
  trains: Train[];
  closures: PlatformClosure[];
  currentTimeStr: string; // e.g. "08:45"
  onPlatformClick: (platform: Platform) => void;
  onTrainClick: (train: Train) => void;
  selectedTrainId?: string;
  theme?: 'light' | 'dark';
}

export const StationYardDiagram: React.FC<StationYardDiagramProps> = ({
  station,
  trains,
  closures,
  currentTimeStr,
  onPlatformClick,
  onTrainClick,
  selectedTrainId,
  theme = 'light',
}) => {
  const [hoveredTrain, setHoveredTrain] = useState<Train | null>(null);

  const isLight = theme === 'light';

  const timeToMinutes = (t: string) => {
    try {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    } catch {
      return 0;
    }
  };

  const currentM = timeToMinutes(currentTimeStr);

  const getOccupyingTrain = (pfNum: number): Train | null => {
    return (
      trains.find((t) => {
        if (t.assigned_platform !== pfNum) return false;
        const arr = timeToMinutes(t.actual_arrival || t.scheduled_arrival);
        const dep = timeToMinutes(t.actual_departure || t.scheduled_departure);
        return currentM >= arr && currentM <= dep;
      }) || null
    );
  };

  const getActiveClosure = (pfNum: number): PlatformClosure | null => {
    return (
      closures.find((c) => {
        if (!c.active || c.platform_number !== pfNum) return false;
        const s = timeToMinutes(c.start_time);
        const e = timeToMinutes(c.end_time);
        return currentM >= s && currentM <= e;
      }) || null
    );
  };

  const getTrainCategoryColor = (category: string) => {
    switch (category) {
      case 'VANDE_BHARAT':
        return isLight ? 'fill-[#1F4E9E] stroke-[#13305C]' : 'fill-cyan-500 stroke-cyan-300';
      case 'RAJDHANI':
        return isLight ? 'fill-[#C9352B] stroke-[#8B1E17]' : 'fill-rose-500 stroke-rose-300';
      case 'SUPERFAST':
        return isLight ? 'fill-[#E08A1E] stroke-[#B3680D]' : 'fill-amber-500 stroke-amber-300';
      case 'EXPRESS':
        return isLight ? 'fill-[#2B5EA7] stroke-[#193F75]' : 'fill-blue-500 stroke-blue-300';
      case 'PASSENGER':
        return isLight ? 'fill-[#2B7A78] stroke-[#1A504E]' : 'fill-purple-500 stroke-purple-300';
      case 'FREIGHT':
        return isLight ? 'fill-[#3B4D61] stroke-[#1E2833]' : 'fill-emerald-600 stroke-emerald-300';
      default:
        return isLight ? 'fill-[#4A5568] stroke-[#2D3748]' : 'fill-slate-500 stroke-slate-300';
    }
  };

  // Platform layout metrics
  const startY = 80;
  const rowHeight = 70;
  const trackStartX = 180;
  const trackEndX = 820;

  return (
    <div className="glass-panel p-4 relative overflow-hidden transition-colors">
      {/* Station Header & Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1F4E9E]/10 border border-[#1F4E9E]/30 rounded-xl text-[#1F4E9E] dark:text-cyan-400">
            <TrainIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide flex items-center gap-2 text-[var(--ink)]">
              <span className="font-['Barlow_Condensed'] text-xl font-bold uppercase">{station.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#1F4E9E]/15 text-[#1F4E9E] dark:bg-blue-900/60 dark:text-blue-300 font-mono font-bold">
                [{station.code}]
              </span>
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Digital Twin Yard Interlocking &bull; 4 Approach Throats &bull; Safety Buffer: {station.min_headway_buffer_minutes}m
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/70 dark:bg-slate-800/80 border border-[var(--line)] rounded-lg shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[var(--ink-soft)] font-medium">SIM TIME:</span>
            <span className="text-[#1F4E9E] dark:text-cyan-400 font-bold text-sm">{currentTimeStr}</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ink-soft)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Clear
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Margin
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Blocked
          </div>
        </div>
      </div>

      {/* Interactive SVG Diagram */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 1000 520"
          className="w-full min-w-[900px] h-auto select-none font-sans"
        >
          <defs>
            <pattern id="yardGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={isLight ? 'rgba(19,48,92,0.06)' : '#1E293B'}
                strokeWidth="0.7"
              />
            </pattern>
            <pattern id="closureHatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="16" stroke="#EF4444" strokeWidth="6" strokeOpacity="0.7" />
              <line x1="0" y1="0" x2="0" y2="16" stroke={isLight ? '#FFFFFF' : '#000000'} strokeWidth="6" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* SVG Translucent Background */}
          <rect x="0" y="0" width="1000" height="520" fill={isLight ? 'rgba(255, 255, 255, 0.35)' : 'rgba(11, 19, 43, 0.45)'} rx="8" />
          <rect x="0" y="0" width="1000" height="520" fill="url(#yardGrid)" rx="8" />

          {/* North Throat Approaches */}
          <g id="north-approaches">
            <text x="30" y="140" fill={isLight ? '#3F5780' : '#64748B'} fontSize="13" fontFamily="'Barlow Condensed', monospace" fontWeight="bold">NORTH MAIN UP [L1]</text>
            <path d="M 20 150 L 120 150 L 180 115" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <path d="M 120 150 L 180 185" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <path d="M 120 150 L 180 255" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="110" cy="142" r="5" fill="#10B981" className="signal-blink" />

            <text x="30" y="340" fill={isLight ? '#3F5780' : '#64748B'} fontSize="13" fontFamily="'Barlow Condensed', monospace" fontWeight="bold">NORTH LOOP UP [L2]</text>
            <path d="M 20 350 L 120 350 L 180 325" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <path d="M 120 350 L 180 395" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <path d="M 120 350 L 180 465" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <circle cx="110" cy="342" r="5" fill="#10B981" />
          </g>

          {/* South Throat Approaches */}
          <g id="south-approaches">
            <text x="860" y="140" fill={isLight ? '#3F5780' : '#64748B'} fontSize="13" fontFamily="'Barlow Condensed', monospace" fontWeight="bold">SOUTH MAIN DN [L3]</text>
            <path d="M 820 115 L 880 150 L 980 150" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <path d="M 820 185 L 880 150" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <path d="M 820 255 L 880 150" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="890" cy="142" r="5" fill="#10B981" />

            <text x="860" y="340" fill={isLight ? '#3F5780' : '#64748B'} fontSize="13" fontFamily="'Barlow Condensed', monospace" fontWeight="bold">SOUTH LOOP DN [L4]</text>
            <path d="M 820 325 L 880 350 L 980 350" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <path d="M 820 395 L 880 350" fill="none" stroke={isLight ? '#8B9CB2' : '#334155'} strokeWidth="3" />
            <circle cx="890" cy="342" r="5" fill="#10B981" />
          </g>

          {/* Station Concourse Graphic */}
          <rect
            x="360"
            y="17"
            width="280"
            height="32"
            rx="6"
            fill={isLight ? '#FFFFFF' : '#1E293B'}
            stroke={isLight ? 'rgba(19,48,92,0.2)' : '#475569'}
            strokeWidth="1.5"
          />
          <rect x="360" y="6" width="280" height="6" rx="3" fill="#1F4E9E" />
          <text
            x="500"
            y="37"
            textAnchor="middle"
            fill={isLight ? '#13305C' : '#E2E8F0'}
            fontSize="11.5"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="bold"
            letterSpacing="0.5"
          >
            DEVGARH PASSENGER CONCOURSE & INTERCHANGE
          </text>

          {/* Render Platform Tracks */}
          {station.platforms.map((platform, idx) => {
            const y = startY + idx * rowHeight;
            const occupyingTrain = getOccupyingTrain(platform.number);
            const activeClosure = getActiveClosure(platform.number);
            const isBay = platform.line_type === 'TERMINAL';
            const effTrackEnd = isBay ? 650 : trackEndX;

            return (
              <g
                key={platform.id}
                className="cursor-pointer group"
                onClick={() => onPlatformClick(platform)}
              >
                {/* Platform Concrete Slab Deck */}
                <rect
                  x="200"
                  y={y - 24}
                  width="600"
                  height="16"
                  rx="3"
                  fill={isLight ? '#FFFFFF' : '#1E293B'}
                  stroke={isLight ? 'rgba(19,48,92,0.18)' : '#334155'}
                  strokeWidth="1"
                  className="group-hover:stroke-blue-500 transition-colors"
                />

                {/* Tactile Warning Stripe */}
                <line x1="200" y1={y - 9} x2="800" y2={y - 9} stroke="#F2C230" strokeWidth="1.5" />

                {/* Platform Tag */}
                <rect x="205" y={y - 22} width="112" height="12" rx="2" fill={isLight ? '#EAF1F8' : '#0F172A'} />
                <text x="210" y={y - 13} fill={isLight ? '#13305C' : '#94A3B8'} fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                  PF {platform.number} &bull; {platform.length_coaches}C &bull; {platform.line_type}
                </text>

                {/* 25kV Catenary Indicator */}
                {platform.electrified && (
                  <g transform={`translate(325, ${y - 22})`}>
                    <circle cx="5" cy="6" r="5" fill="#0284C7" fillOpacity={isLight ? '0.15' : '0.3'} />
                    <text x="5" y="9" textAnchor="middle" fill="#0284C7" fontSize="9.5" fontWeight="bold">25kV</text>
                  </g>
                )}

                {/* Steel Rails */}
                <line
                  x1={trackStartX}
                  y1={y}
                  x2={effTrackEnd}
                  y2={y}
                  stroke={isLight ? '#64748B' : '#475569'}
                  strokeWidth="3.5"
                />

                {/* Ties / Sleepers */}
                {Array.from({ length: 28 }).map((_, sIdx) => {
                  const tieX = trackStartX + sIdx * ((effTrackEnd - trackStartX) / 28);
                  return (
                    <line
                      key={sIdx}
                      x1={tieX}
                      y1={y - 5}
                      x2={tieX}
                      y2={y + 5}
                      stroke={isLight ? '#A0AEC0' : '#334155'}
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Buffer stop if bay */}
                {isBay && (
                  <g transform={`translate(${effTrackEnd}, ${y - 12})`}>
                    <rect x="0" y="0" width="8" height="24" fill="#DC2626" rx="2" />
                    <line x1="0" y1="12" x2="14" y2="12" stroke="#EF4444" strokeWidth="3" />
                    <text x="18" y="15" fill="#EF4444" fontSize="10.5" fontWeight="bold">BUFFER STOP</text>
                  </g>
                )}

                {/* Signal Lamp */}
                <circle
                  cx={effTrackEnd + 15}
                  y={y}
                  r="5"
                  fill={activeClosure ? '#EF4444' : occupyingTrain ? '#F59E0B' : '#10B981'}
                />

                {/* ACTIVE CLOSURE */}
                {activeClosure && (
                  <g>
                    <rect
                      x="220"
                      y={y - 16}
                      width="560"
                      height="32"
                      fill="url(#closureHatch)"
                      stroke="#EF4444"
                      strokeWidth="2"
                      rx="4"
                      className="animate-pulse"
                    />
                    <rect x="360" y={y - 12} width="280" height="24" rx="4" fill="#B91C1C" stroke="#EF4444" strokeWidth="1.5" />
                    <text x="500" y={y + 4} textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="bold">
                      PLATFORM CLOSED ({activeClosure.start_time} - {activeClosure.end_time}): {activeClosure.reason.substring(0, 32)}
                    </text>
                  </g>
                )}

                {/* TRAIN OCCUPANCY */}
                {occupyingTrain && !activeClosure && (
                  <g
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrainClick(occupyingTrain);
                    }}
                    onMouseEnter={() => setHoveredTrain(occupyingTrain)}
                    onMouseLeave={() => setHoveredTrain(null)}
                  >
                    <rect
                      x="240"
                      y={y - 15}
                      width="520"
                      height="30"
                      rx="6"
                      className={`${getTrainCategoryColor(occupyingTrain.category)} transition-all ${
                        selectedTrainId === occupyingTrain.id ? 'stroke-white stroke-2 shadow-xl' : ''
                      }`}
                    />

                    {/* Locomotive Nose */}
                    <path
                      d={
                        occupyingTrain.direction === 'NORTHBOUND'
                          ? `M 240 ${y - 15} L 220 ${y} L 240 ${y + 15} Z`
                          : `M 760 ${y - 15} L 780 ${y} L 760 ${y + 15} Z`
                      }
                      fill={isLight ? '#0B2247' : '#1E293B'}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />

                    {/* Headlight beam */}
                    <circle
                      cx={occupyingTrain.direction === 'NORTHBOUND' ? 222 : 778}
                      cy={y}
                      r="3"
                      fill="#FEF08A"
                      className="animate-ping"
                    />

                    {/* Label */}
                    <text
                      x="500"
                      y={y + 4}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="13"
                      fontWeight="bold"
                    >
                      {occupyingTrain.train_number} &bull; {occupyingTrain.name} ({occupyingTrain.category})
                    </text>

                    {/* Time Window */}
                    <rect x="670" y={y - 11} width="80" height="22" rx="3" fill="#000000" fillOpacity="0.45" />
                    <text x="710" y={y + 4} textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontFamily="monospace">
                      {occupyingTrain.actual_arrival || occupyingTrain.scheduled_arrival} &rarr; {occupyingTrain.actual_departure || occupyingTrain.scheduled_departure}
                    </text>

                    {/* Priority Badge */}
                    <rect x="250" y={y - 11} width="48" height="22" rx="3" fill="#000000" fillOpacity="0.45" />
                    <text x="274" y={y + 4} textAnchor="middle" fill="#FEF08A" fontSize="10.5" fontWeight="bold">
                      PRI {occupyingTrain.priority}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Train Hover Card */}
      {hoveredTrain && (
        <div className="absolute bottom-4 right-4 z-20 bg-white/95 dark:bg-slate-900/95 border border-[#1F4E9E]/40 p-4 rounded-xl shadow-2xl backdrop-blur-md max-w-sm text-[var(--ink)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#1F4E9E]/15 text-[#1F4E9E] font-mono text-xs font-bold border border-[#1F4E9E]/30">
                {hoveredTrain.train_number}
              </span>
              <h3 className="font-bold text-sm">{hoveredTrain.name}</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-[#F2C230]/20 text-[#13305C] font-bold">
              Priority {hoveredTrain.priority}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div>
              <span className="text-[var(--ink-soft)] block text-[10px]">Route:</span>
              <span className="font-medium">{hoveredTrain.origin} &rarr; {hoveredTrain.destination}</span>
            </div>
            <div>
              <span className="text-[var(--ink-soft)] block text-[10px]">Platform Assigned:</span>
              <span className="font-bold text-[#1F4E9E]">Platform {hoveredTrain.assigned_platform}</span>
            </div>
            <div>
              <span className="text-[var(--ink-soft)] block text-[10px]">Schedule:</span>
              <span className="font-mono">{hoveredTrain.scheduled_arrival} &rarr; {hoveredTrain.scheduled_departure}</span>
            </div>
            <div>
              <span className="text-[var(--ink-soft)] block text-[10px]">Dwell Time:</span>
              <span className="font-mono text-emerald-600 font-bold">{hoveredTrain.min_dwell_minutes}m required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
