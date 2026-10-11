import React from 'react';
import { Train, ValidationResult } from '../types/railway';
import { Clock, ArrowUpDown, ShieldCheck, Activity, TrendingUp } from 'lucide-react';

interface MetricsComparisonBarProps {
  originalTrains: Train[];
  replannedTrains: Train[];
  validation: ValidationResult;
  solverTimeMs: number;
  solverUsed: string;
}

export const MetricsComparisonBar: React.FC<MetricsComparisonBarProps> = ({
  originalTrains,
  replannedTrains,
  validation,
  solverTimeMs,
  solverUsed,
}) => {
  const origTotalDelay = originalTrains.reduce(
    (acc, t) => acc + (t.delay_departure_minutes || 0) + (t.inbound_delay_minutes || 0),
    0
  );
  const replannedTotalDelay = replannedTrains.reduce(
    (acc, t) => acc + (t.delay_departure_minutes || 0) + (t.inbound_delay_minutes || 0),
    0
  );

  const platformSwaps = replannedTrains.filter((t) => {
    const orig = originalTrains.find((ot) => ot.id === t.id);
    return orig && t.assigned_platform !== orig.assigned_platform;
  }).length;

  const onTimeCount = replannedTrains.filter(
    (t) => (t.delay_departure_minutes || 0) === 0 && (t.inbound_delay_minutes || 0) === 0
  ).length;
  const punctuality = Math.round((onTimeCount / Math.max(1, replannedTrains.length)) * 100);

  const p1Trains = replannedTrains.filter((t) => t.priority === 1);
  const p1OnTime = p1Trains.filter((t) => (t.delay_departure_minutes || 0) <= 5).length;
  const p1Punctuality = Math.round((p1OnTime / Math.max(1, p1Trains.length)) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Metric 1: Total Delay Minutes */}
      <div className="glass-panel p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--ink-soft)] text-xs">
          <span className="font-['Barlow_Condensed'] uppercase tracking-wider font-bold text-[11px]">TOTAL DELAY</span>
          <Clock className="w-4 h-4 text-[#1F4E9E] dark:text-cyan-400" />
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-['Barlow_Condensed'] text-[var(--ink)]">
            {replannedTotalDelay}
          </span>
          <span className="text-xs text-[var(--ink-soft)] font-mono">mins</span>
          {replannedTotalDelay !== origTotalDelay && (
            <span className={`text-[11px] font-mono font-bold ${
              replannedTotalDelay > origTotalDelay ? 'text-rose-600' : 'text-emerald-600'
            }`}>
              ({replannedTotalDelay > origTotalDelay ? '+' : ''}{replannedTotalDelay - origTotalDelay}m)
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--ink-soft)] truncate">
          Baseline planned: {origTotalDelay} mins
        </div>
      </div>

      {/* Metric 2: Platform Swaps */}
      <div className="glass-panel p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--ink-soft)] text-xs">
          <span className="font-['Barlow_Condensed'] uppercase tracking-wider font-bold text-[11px]">PLATFORM REASSIGNMENTS</span>
          <ArrowUpDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold font-['Barlow_Condensed'] ${
            platformSwaps > 0 ? 'text-purple-700 dark:text-purple-300' : 'text-[var(--ink)]'
          }`}>
            {platformSwaps}
          </span>
          <span className="text-xs text-[var(--ink-soft)]">swaps</span>
        </div>
        <div className="text-[11px] text-[var(--ink-soft)] truncate">
          Preserved passenger berths: {replannedTrains.length - platformSwaps}
        </div>
      </div>

      {/* Metric 3: Overall Punctuality */}
      <div className="glass-panel p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--ink-soft)] text-xs">
          <span className="font-['Barlow_Condensed'] uppercase tracking-wider font-bold text-[11px]">PUNCTUALITY INDEX</span>
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold font-['Barlow_Condensed'] ${
            punctuality >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            {punctuality}%
          </span>
          <span className="text-xs text-[var(--ink-soft)]">on-time</span>
        </div>
        <div className="text-[11px] text-[var(--ink-soft)] truncate">
          {onTimeCount} of {replannedTrains.length} trains on-schedule
        </div>
      </div>

      {/* Metric 4: Priority 1 Service Rate */}
      <div className="glass-panel p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--ink-soft)] text-xs">
          <span className="font-['Barlow_Condensed'] uppercase tracking-wider font-bold text-[11px]">PRIORITY 1 PROTECTION</span>
          <TrendingUp className="w-4 h-4 text-[#1F4E9E] dark:text-cyan-400" />
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-['Barlow_Condensed'] text-[#1F4E9E] dark:text-cyan-300">
            {p1Punctuality}%
          </span>
          <span className="text-xs text-[var(--ink-soft)]">premium</span>
        </div>
        <div className="text-[11px] text-[var(--ink-soft)] truncate">
          Vande Bharat / Rajdhani secured
        </div>
      </div>

      {/* Metric 5: Independent Safety Compliance */}
      <div className="glass-panel p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--ink-soft)] text-xs">
          <span className="font-['Barlow_Condensed'] uppercase tracking-wider font-bold text-[11px]">SAFETY AUDIT SCORE</span>
          <ShieldCheck className={`w-4 h-4 ${validation.is_valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold font-['Barlow_Condensed'] ${
            validation.is_valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {validation.safety_compliance_score.toFixed(0)}%
          </span>
          <span className="text-xs text-[var(--ink-soft)]">compliant</span>
        </div>
        <div className="text-[11px] font-mono truncate text-[var(--ink-soft)]">
          Solver: {solverUsed.substring(0, 15)} ({solverTimeMs.toFixed(0)}ms)
        </div>
      </div>
    </div>
  );
};
