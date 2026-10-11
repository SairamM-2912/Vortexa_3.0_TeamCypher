import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

export type ReplanningStage =
  | 'ANALYZING_DISRUPTIONS'
  | 'DETECTING_CONFLICTS'
  | 'IDENTIFYING_AFFECTED_TRAINS'
  | 'CALCULATING_FEASIBLE_ASSIGNMENTS'
  | 'OPTIMIZING_TIMETABLE'
  | 'VALIDATING_SAFETY'
  | 'PREPARING_SUMMARY';

export interface StageInfo {
  key: ReplanningStage;
  label: string;
  description: string;
}

export const REPLANNING_STAGES: StageInfo[] = [
  {
    key: 'ANALYZING_DISRUPTIONS',
    label: 'Analyzing Disruptions',
    description: 'Scanning injected delays, platform closures, and headway constraints...',
  },
  {
    key: 'DETECTING_CONFLICTS',
    label: 'Detecting Platform & Track Conflicts',
    description: 'Auditing physical platform overlaps and headway buffer violations...',
  },
  {
    key: 'IDENTIFYING_AFFECTED_TRAINS',
    label: 'Identifying Affected Trains',
    description: 'Determining prioritized cascade services requiring reassignment...',
  },
  {
    key: 'CALCULATING_FEASIBLE_ASSIGNMENTS',
    label: 'Calculating Feasible Alternatives',
    description: 'Verifying platform length, coach capacity, and 25kV OHE catenary...',
  },
  {
    key: 'OPTIMIZING_TIMETABLE',
    label: 'Optimizing Revised Timetable',
    description: 'Solving constraint model via OR-Tools CP-SAT (penalty minimization)...',
  },
  {
    key: 'VALIDATING_SAFETY',
    label: 'Independently Validating Safety',
    description: 'Independent audit engine verifying 100% zero-conflict compliance...',
  },
  {
    key: 'PREPARING_SUMMARY',
    label: 'Preparing Change Summary',
    description: 'Compiling causal explainability records and delta comparison...',
  },
];

interface ReplanningProgressModalProps {
  isOpen: boolean;
  currentStage: ReplanningStage;
  solverUsed?: string;
  error?: string | null;
  onDismissError?: () => void;
}

export const ReplanningProgressModal: React.FC<ReplanningProgressModalProps> = ({
  isOpen,
  currentStage,
  solverUsed = 'Google OR-Tools CP-SAT',
  error,
  onDismissError,
}) => {
  if (!isOpen) return null;

  const currentStageIndex = REPLANNING_STAGES.findIndex((s) => s.key === currentStage);
  const activeStageInfo = REPLANNING_STAGES[currentStageIndex] || REPLANNING_STAGES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0B132B] border border-slate-300 dark:border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1F4E9E] rounded-xl text-white shadow-md">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-[#0B132B] dark:text-white text-base">
                Replanning Timetable in Progress
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Deterministic Constraint Optimization Engine &bull; {solverUsed}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Replanning Operation Failed</span>
              </div>
              <p className="text-xs leading-relaxed font-mono">{error}</p>
              <div className="pt-2 text-right">
                <button
                  onClick={onDismissError}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow"
                >
                  Dismiss & Review Timetable
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Stage Callout */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-slate-900 border border-blue-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#1F4E9E] dark:text-cyan-400">
                    STAGE {currentStageIndex + 1} OF {REPLANNING_STAGES.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse"></span>
                    EXECUTING
                  </span>
                </div>
                <div className="font-bold text-[#0B132B] dark:text-white text-sm">
                  {activeStageInfo.label}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {activeStageInfo.description}
                </p>
              </div>

              {/* Indeterminate Animated Progress Track */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                  <span>Optimization Solver Pipeline</span>
                  <span>Processing...</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 rounded-full animate-indeterminate"
                    style={{ width: '45%' }}
                  />
                </div>
              </div>

              {/* Step By Step Checklist */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                {REPLANNING_STAGES.map((stage, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const isPending = idx > currentStageIndex;

                  return (
                    <div
                      key={stage.key}
                      className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg transition-colors ${
                        isCurrent
                          ? 'bg-blue-100/60 dark:bg-slate-800 font-semibold text-[#0B132B] dark:text-white'
                          : isDone
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-4 h-4 text-[#1F4E9E] dark:text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[9px] font-mono shrink-0">
                            {idx + 1}
                          </div>
                        )}
                        <span>{stage.label}</span>
                      </div>
                      <span className="font-mono text-[10px]">
                        {isDone ? (
                          <span className="text-emerald-600 font-bold">COMPLETED</span>
                        ) : isCurrent ? (
                          <span className="text-blue-600 dark:text-cyan-400 font-bold">RUNNING</span>
                        ) : (
                          <span>QUEUED</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Notice */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict Rule: Zero Dispatched Overlaps</span>
          </div>
          <div>Duplicate triggers locked</div>
        </div>
      </div>
    </div>
  );
};
