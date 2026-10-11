import React from 'react';
import { ValidationResult } from '../types/railway';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

interface ValidationModalProps {
  validation: ValidationResult;
  isOpen: boolean;
  onClose: () => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  validation,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const checks = [
    {
      name: 'Physical Platform Overlap Check',
      description: 'Zero concurrent occupancy on any platform track',
      passed: validation.overlap_checks_passed,
    },
    {
      name: 'Safety Headway Buffer Gap Check',
      description: 'Mandatory minimum 10-minute clearance between consecutive train services',
      passed: validation.headway_buffer_passed,
    },
    {
      name: 'Platform Length & Coach Capacity Check',
      description: 'Train coach count cannot exceed platform berthing length capacity',
      passed: validation.platform_length_passed,
    },
    {
      name: 'Traction & Electrification Check',
      description: 'Electric locomotives require 25kV OHE catenary overhead wiring',
      passed: validation.traction_compatibility_passed,
    },
    {
      name: 'Platform Closure & Blockade Clearance',
      description: 'No trains permitted inside maintenance block windows',
      passed: validation.closure_conflict_passed,
    },
    {
      name: 'Minimum Passenger Dwell Check',
      description: 'Trains must satisfy minimum dwell duration before departure clearance',
      passed: validation.dwell_time_passed,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F172A] border border-[var(--line)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-4 flex items-center justify-between border-b ${
          validation.is_valid
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              validation.is_valid ? 'bg-emerald-600/15 text-emerald-600' : 'bg-rose-600/15 text-rose-600'
            }`}>
              {validation.is_valid ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
                Independent Railway Safety Verification
                {validation.is_valid ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-mono font-bold">
                    PASSED
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 font-mono font-bold">
                    FAILED
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                Audited by {validation.validator_engine_version}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink-soft)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[var(--ink)]">
          {/* Scorecard Hero Banner */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1F4E9E]/5 dark:bg-slate-900 p-4 rounded-xl border border-[var(--line)] text-center">
              <span className="text-[var(--ink-soft)] text-xs block mb-1 font-['Barlow_Condensed'] uppercase tracking-wider font-bold">
                SAFETY COMPLIANCE SCORE
              </span>
              <div className={`text-4xl font-extrabold font-['Barlow_Condensed'] ${
                validation.safety_compliance_score >= 90 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {validation.safety_compliance_score.toFixed(1)}%
              </div>
              <span className="text-[11px] text-[var(--ink-soft)] mt-1 block">
                {validation.is_valid ? '100% physically collision-free' : 'Contains safety violations'}
              </span>
            </div>

            <div className="bg-[#1F4E9E]/5 dark:bg-slate-900 p-4 rounded-xl border border-[var(--line)] flex flex-col justify-between">
              <div>
                <span className="text-[var(--ink-soft)] text-xs block mb-1 font-['Barlow_Condensed'] uppercase tracking-wider font-bold">
                  AUDIT VERDICT
                </span>
                <div className={`font-bold text-sm ${validation.is_valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {validation.is_valid ? 'CERTIFIED FEASIBLE FOR DISPATCH' : 'DISPATCH BLOCKED: HAZARDS DETECTED'}
                </div>
              </div>
              <div className="font-mono text-[10px] text-[var(--ink-soft)]">
                Timestamp: {validation.audit_timestamp}
              </div>
            </div>
          </div>

          {/* 6 Independent Checks */}
          <div className="space-y-2">
            <h4 className="font-['Barlow_Condensed'] text-xs text-[var(--ink-soft)] uppercase tracking-wider font-bold">
              INDEPENDENT SAFETY RULE AUDIT PASSES:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {checks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    chk.passed
                      ? 'bg-white dark:bg-slate-900/80 border-[var(--line)] shadow-sm'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800'
                  }`}
                >
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-[var(--ink)] text-xs">{chk.name}</div>
                    <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">{chk.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Errors List */}
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-['Barlow_Condensed'] text-xs text-rose-600 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                SAFETY VIOLATIONS REJECTING DISPATCH ({validation.errors.length}):
              </h4>
              <div className="space-y-1.5">
                {validation.errors.map((err, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-mono text-[11px] leading-relaxed">
                    &bull; {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings List */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-['Barlow_Condensed'] text-xs text-amber-600 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                OPERATIONAL BOTTLENECK WARNINGS ({validation.warnings.length}):
              </h4>
              <div className="space-y-1.5">
                {validation.warnings.map((warn, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-800 dark:text-amber-200 font-mono text-[11px]">
                    &bull; {warn}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-600 dark:text-slate-400 text-[11px] font-mono">
            RailFlow Safety Audit Engine &bull; Zero Hallucination Deterministic Guarantee
          </div>
          <button
            onClick={onClose}
            className="btn-primary px-5 py-2 text-xs font-bold rounded-lg shadow-sm"
          >
            Dismiss Report
          </button>
        </div>
      </div>
    </div>
  );
};
