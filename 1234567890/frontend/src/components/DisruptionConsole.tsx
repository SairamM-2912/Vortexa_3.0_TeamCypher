import React, { useState } from 'react';
import { Train, PlatformClosure, DisruptionEvent } from '../types/railway';
import { api } from '../services/api';
import { 
  Radio, AlertTriangle, Ban, Sparkles, Trash2, 
  RefreshCw, CheckCircle2, Bookmark, PlayCircle 
} from 'lucide-react';

interface DisruptionConsoleProps {
  trains: Train[];
  closures: PlatformClosure[];
  onApplyDelay: (trainNumber: string, delayMinutes: number, reason: string) => void;
  onAddClosure: (closure: PlatformClosure) => void;
  onRemoveClosure: (closureId: string) => void;
  onResetTimetable: () => void;
  onLoadBenchmark: (benchmarkId: string) => void;
  activeDisruptionsCount: number;
}

export const DisruptionConsole: React.FC<DisruptionConsoleProps> = ({
  trains,
  closures,
  onApplyDelay,
  onAddClosure,
  onRemoveClosure,
  onResetTimetable,
  onLoadBenchmark,
  activeDisruptionsCount,
}) => {
  const [activeTab, setActiveTab] = useState<'nlp' | 'train' | 'platform' | 'benchmarks'>('nlp');
  
  // NLP State
  const [nlpText, setNlpText] = useState('');
  const [nlpParsing, setNlpParsing] = useState(false);
  const [nlpResult, setNlpResult] = useState<any | null>(null);

  // Manual Train Delay State
  const [selectedTrainNum, setSelectedTrainNum] = useState<string>(trains[0]?.train_number || '22436');
  const [delayMinutes, setDelayMinutes] = useState<number>(30);
  const [delayReason, setDelayReason] = useState<string>('Dense fog causing speed restriction');

  // Manual Platform Closure State
  const [closurePlatform, setClosurePlatform] = useState<number>(2);
  const [closureStart, setClosureStart] = useState<string>('08:15');
  const [closureEnd, setClosureEnd] = useState<string>('10:30');
  const [closureReason, setClosureReason] = useState<string>('Track maintenance & ultrasound flaw detection');

  const handleParseNLP = async () => {
    if (!nlpText.trim()) return;
    setNlpParsing(true);
    setNlpResult(null);
    try {
      const res = await api.parseDisruptionText(nlpText);
      setNlpResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setNlpParsing(false);
    }
  };

  const handleApplyNLPEvents = () => {
    if (!nlpResult?.extracted_events) return;
    nlpResult.extracted_events.forEach((evt: DisruptionEvent) => {
      if (evt.type === 'TRAIN_DELAY' && evt.train_number && evt.delay_minutes) {
        onApplyDelay(evt.train_number, evt.delay_minutes, evt.description);
      } else if (evt.type === 'PLATFORM_CLOSURE' && evt.platform_number && evt.start_time && evt.end_time) {
        onAddClosure({
          id: `CL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          platform_number: evt.platform_number,
          start_time: evt.start_time,
          end_time: evt.end_time,
          reason: evt.description,
          active: true,
        });
      }
    });
    setNlpText('');
    setNlpResult(null);
  };

  const samplePrompts = [
    "Train 12002 is delayed by 35 minutes due to signal failure in block section",
    "Platform 2 is closed from 08:30 to 10:45 due to emergency track fracture repair",
    "OHE wire snap on Platform 1 until 10:00. Also delay train 12951 by 25 mins",
    "Train 22436 running 40 mins late due to dense fog in northern sector"
  ];

  return (
    <div className="dashboard-card p-5 flex flex-col h-full shadow-lg">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-600/10 text-rose-600 rounded-lg border border-rose-300">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--ink)] text-sm tracking-wide">
              Disruption Incident Injection Console
            </h3>
            <p className="text-[11px] text-[var(--ink-muted)]">
              Inject delays, platform blockades, or free-text radio telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeDisruptionsCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse font-bold">
              {activeDisruptionsCount} active disruption(s)
            </span>
          )}
          {/* Secondary Button: light background with dark navy text */}
          <button
            onClick={onResetTimetable}
            title="Reset all trains to nominal timetable"
            className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Nominal
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      {/* Selected tab: clear blue background with white text. Unselected: dark background with light-grey text */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#0F172A] rounded-xl border border-slate-700 mb-4 text-xs">
        <button
          onClick={() => setActiveTab('nlp')}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'nlp'
              ? 'bg-[#2563EB] text-white font-bold shadow-md'
              : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 font-medium'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="truncate">Free-Text NLP</span>
        </button>
        <button
          onClick={() => setActiveTab('train')}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'train'
              ? 'bg-[#2563EB] text-white font-bold shadow-md'
              : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 font-medium'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="truncate">Train Delay</span>
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'platform'
              ? 'bg-[#2563EB] text-white font-bold shadow-md'
              : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 font-medium'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span className="truncate">Platform Closure</span>
        </button>
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'benchmarks'
              ? 'bg-[#2563EB] text-white font-bold shadow-md'
              : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 font-medium'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span className="truncate">Benchmarks</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 flex flex-col justify-between">
        {/* TAB 1: NLP DISRUPTION DISPATCH */}
        {activeTab === 'nlp' && (
          <div className="space-y-3.5">
            <div className="text-xs text-[var(--ink-secondary)] font-medium leading-relaxed">
              Type or paste free-text incident reports. The NLP processor translates them into structured constraints without assigning platforms.
            </div>

            {/* Textarea: Solid dark navy background with white input text, light-grey placeholder, visible border */}
            <textarea
              rows={3}
              value={nlpText}
              onChange={(e) => setNlpText(e.target.value)}
              placeholder="e.g. Train 12002 is delayed by 35 mins due to signal failure. Also Platform 2 is closed from 08:30 to 10:30."
              className="w-full bg-[#0B132B] text-white placeholder-slate-400 border border-slate-600 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30 focus:outline-none rounded-lg p-3 text-xs font-mono resize-none shadow-inner"
            />

            {/* Quick Incident Prompt Buttons: Dark navy background with white text and visible borders */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[var(--ink-secondary)] block font-['Barlow_Condensed'] uppercase tracking-wider font-bold">
                QUICK INCIDENT PROMPTS:
              </span>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setNlpText(prompt)}
                    className="text-left text-[11px] px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white border border-slate-600 hover:border-blue-400 font-medium transition-colors shadow-sm max-w-full"
                  >
                    &bull; {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {/* Primary button: blue background with white text */}
              <button
                disabled={nlpParsing || !nlpText.trim()}
                onClick={handleParseNLP}
                className="btn-primary flex items-center gap-2 text-xs px-4 py-2 disabled:opacity-50"
              >
                {nlpParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Parse Free-Text Telemetry
              </button>

              {nlpResult && (
                <button
                  onClick={handleApplyNLPEvents}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Apply {nlpResult.extracted_events?.length || 0} Incident Event(s)
                </button>
              )}
            </div>

            {/* Parsed Result Card */}
            {nlpResult && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg text-xs space-y-2 mt-2 shadow-sm">
                <div className="font-bold text-[#1D4ED8] dark:text-blue-300 flex items-center justify-between">
                  <span>Detected Structured Telemetry:</span>
                  <span className="text-[10px] text-[var(--ink-muted)] font-mono">Confidence: 95%</span>
                </div>
                <div className="space-y-1.5">
                  {nlpResult.extracted_events?.map((evt: DisruptionEvent, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-[var(--ink)] bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded border border-[var(--line)] shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span className="font-mono text-blue-700 dark:text-blue-300 font-bold">{evt.type}</span>
                      <span className="font-medium">{evt.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL TRAIN DELAY */}
        {activeTab === 'train' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[var(--ink-secondary)] block mb-1 font-semibold">Target Train:</label>
                <select
                  value={selectedTrainNum}
                  onChange={(e) => setSelectedTrainNum(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line-strong)] rounded-lg p-2 text-[var(--ink)] text-xs font-medium focus:outline-none focus:border-blue-600 shadow-sm"
                >
                  {trains.map((t) => (
                    <option key={t.id} value={t.train_number}>
                      {t.train_number} - {t.name} (Sched: {t.scheduled_arrival})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[var(--ink-secondary)] block mb-1 font-semibold">Inbound Delay (Minutes):</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  step={5}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line-strong)] rounded-lg p-2 text-[var(--ink)] text-xs font-mono font-bold focus:outline-none focus:border-blue-600 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[var(--ink-secondary)] block mb-1 text-xs font-semibold">Operational Reason / Root Cause:</label>
              <input
                type="text"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="e.g. Signal failure in block section / Loco breakdown"
                className="w-full bg-white dark:bg-slate-900 border border-[var(--line-strong)] rounded-lg p-2 text-[var(--ink)] text-xs font-medium focus:outline-none focus:border-blue-600 shadow-sm"
              />
            </div>

            {/* Primary button: blue background with white text */}
            <button
              onClick={() => onApplyDelay(selectedTrainNum, delayMinutes, delayReason)}
              className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-2.5 shadow-md"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Inject +{delayMinutes}m Delay on Train {selectedTrainNum}
            </button>
          </div>
        )}

        {/* TAB 3: PLATFORM CLOSURE */}
        {activeTab === 'platform' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-[var(--ink-secondary)] block mb-1 font-semibold">Platform:</label>
                <select
                  value={closurePlatform}
                  onChange={(e) => setClosurePlatform(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line-strong)] rounded-lg p-2 text-[var(--ink)] text-xs font-medium shadow-sm"
                >
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <option key={p} value={p}>Platform {p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[var(--ink-secondary)] block mb-1 font-semibold">Start Time:</label>
                <input
                  type="time"
                  value={closureStart}
                  onChange={(e) => setClosureStart(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line-strong)] rounded-lg p-2 text-[var(--ink)] text-xs font-mono font-medium shadow-sm"
                />
              </div>

              <div>
                <label className="text-[var(--ink-secondary)] block mb-1 font-semibold">End Time:</label>
                <input
                  type="time"
                  value={closureEnd}
                  onChange={(e) => setClosureEnd(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line-strong)] rounded-lg p-2 text-[var(--ink)] text-xs font-mono font-medium shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[var(--ink-secondary)] block mb-1 text-xs font-semibold">Blockade Reason:</label>
              <input
                type="text"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                placeholder="e.g. Catenary wire snap / Track fracture"
                className="w-full bg-white dark:bg-slate-900 border border-[var(--line-strong)] rounded-lg p-2 text-[var(--ink)] text-xs font-medium shadow-sm"
              />
            </div>

            {/* Destructive action: red background with white text */}
            <button
              onClick={() => {
                onAddClosure({
                  id: `CL-M-${Date.now()}`,
                  platform_number: closurePlatform,
                  start_time: closureStart,
                  end_time: closureEnd,
                  reason: closureReason,
                  active: true,
                });
              }}
              className="btn-danger w-full flex items-center justify-center gap-2 text-xs py-2.5 shadow-md"
            >
              <Ban className="w-3.5 h-3.5" />
              Declare Platform {closurePlatform} Closed ({closureStart} - {closureEnd})
            </button>

            {/* Active Closures List */}
            {closures.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                <span className="text-[11px] text-[var(--ink-secondary)] font-['Barlow_Condensed'] uppercase tracking-wider font-bold">
                  ACTIVE BLOCKADES:
                </span>
                {closures.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 px-3 py-2 rounded-lg text-xs shadow-xs">
                    <div>
                      <span className="font-bold text-rose-700 dark:text-rose-300">Platform {c.platform_number}</span>
                      <span className="text-[var(--ink)] ml-2 font-mono font-bold">{c.start_time}-{c.end_time}</span>
                      <span className="text-[var(--ink-secondary)] text-[11px] block mt-0.5">{c.reason}</span>
                    </div>
                    <button
                      onClick={() => onRemoveClosure(c.id)}
                      title="Reopen Platform"
                      className="p-1.5 hover:bg-rose-200 dark:hover:bg-rose-900 rounded text-rose-700 dark:text-rose-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BENCHMARK PRESETS */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-2.5">
            <div className="text-xs text-[var(--ink-secondary)] font-medium">
              Load official hackathon benchmark scenarios for immediate stress-testing and algorithm demonstration:
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => onLoadBenchmark('BENCHMARK-NOMINAL')}
                className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-[var(--line-strong)] transition-all flex items-center justify-between shadow-xs group"
              >
                <div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">1. Nominal Timetable Baseline</div>
                  <div className="text-[11px] text-[var(--ink-muted)]">12 trains across 6 platforms, dispute-free nominal operations.</div>
                </div>
                <PlayCircle className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => onLoadBenchmark('BENCHMARK-P2-CLOSURE')}
                className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-[var(--line-strong)] transition-all flex items-center justify-between shadow-xs group"
              >
                <div>
                  <div className="font-bold text-rose-700 dark:text-rose-400 text-xs">2. Platform 2 Emergency Rail Fracture</div>
                  <div className="text-[11px] text-[var(--ink-muted)]">Closure of PF 2 from 08:00 to 10:30; displaces Rajdhani & Shatabdi.</div>
                </div>
                <PlayCircle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => onLoadBenchmark('BENCHMARK-FOG-CASCADE')}
                className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-[var(--line-strong)] transition-all flex items-center justify-between shadow-xs group"
              >
                <div>
                  <div className="font-bold text-amber-700 dark:text-amber-400 text-xs">3. Cascading Fog Inbound Wave</div>
                  <div className="text-[11px] text-[var(--ink-muted)]">Simultaneous delays on Vande Bharat (+35m), Rajdhani (+20m), Duronto (+45m).</div>
                </div>
                <PlayCircle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => onLoadBenchmark('BENCHMARK-COMPOUND-OHE')}
                className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-[var(--line-strong)] transition-all flex items-center justify-between shadow-xs group"
              >
                <div>
                  <div className="font-bold text-[#1D4ED8] dark:text-blue-400 text-xs">4. Severe OHE Catenary Snap on PF 1</div>
                  <div className="text-[11px] text-[var(--ink-muted)]">Power cut on PF 1 with two delayed 24-coach heavy rakes.</div>
                </div>
                <PlayCircle className="w-4 h-4 text-[#1D4ED8] group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
