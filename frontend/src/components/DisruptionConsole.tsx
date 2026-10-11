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
    <div className="glass-panel p-4 flex flex-col h-full shadow-xl">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-600/15 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/30">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--ink)] text-sm tracking-wide">
              Disruption Incident Injection Console
            </h3>
            <p className="text-[11px] text-[var(--ink-soft)]">
              Inject delays, platform blockades, or free-text radio telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeDisruptionsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse font-bold">
              {activeDisruptionsCount} active disruption(s)
            </span>
          )}
          <button
            onClick={onResetTimetable}
            title="Reset all trains to nominal timetable"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-[var(--ink)] border border-[var(--line)] transition-colors shadow-sm font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Nominal
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex rounded-lg bg-[#13305C]/8 dark:bg-slate-900 p-1 border border-[var(--line)] mb-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('nlp')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'nlp' ? 'bg-[#1F4E9E] text-white font-bold shadow' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Free-Text NLP
        </button>
        <button
          onClick={() => setActiveTab('train')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'train' ? 'bg-[#E08A1E] text-white font-bold shadow' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Train Delay
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'platform' ? 'bg-[#C9352B] text-white font-bold shadow' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          Platform Closure
        </button>
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'benchmarks' ? 'bg-[#2B5EA7] text-white font-bold shadow' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          Benchmark Presets
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 flex flex-col justify-between">
        {/* TAB 1: NLP DISRUPTION DISPATCH */}
        {activeTab === 'nlp' && (
          <div className="space-y-3">
            <div className="text-xs text-[var(--ink-soft)]">
              Type or paste free-text incident reports. The NLP processor translates them into structured constraints without assigning platforms.
            </div>

            <textarea
              rows={3}
              value={nlpText}
              onChange={(e) => setNlpText(e.target.value)}
              placeholder="e.g. Train 12002 is delayed by 35 mins due to signal failure. Also Platform 2 is closed from 08:30 to 10:30."
              className="w-full bg-white dark:bg-slate-900 border border-[var(--line)] rounded-lg p-2.5 text-xs text-[var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[#1F4E9E] font-mono resize-none shadow-inner"
            />

            {/* Quick Sample Prompts */}
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--ink-soft)] block font-mono font-bold">QUICK INCIDENT PROMPTS:</span>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setNlpText(prompt)}
                    className="text-[11px] text-left px-2 py-1 rounded bg-white/70 dark:bg-slate-800 hover:bg-white text-[var(--ink)] border border-[var(--line)] truncate max-w-full transition-colors shadow-sm"
                  >
                    &bull; {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                disabled={nlpParsing || !nlpText.trim()}
                onClick={handleParseNLP}
                className="flex items-center gap-1.5 text-xs px-4 py-2 bg-[#1F4E9E] hover:bg-[#163c7c] disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow"
              >
                {nlpParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Parse Free-Text Telemetry
              </button>

              {nlpResult && (
                <button
                  onClick={handleApplyNLPEvents}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Apply {nlpResult.extracted_events?.length || 0} Incident Event(s)
                </button>
              )}
            </div>

            {/* Parsed Result Card */}
            {nlpResult && (
              <div className="p-3 bg-white dark:bg-slate-900 border border-[#1F4E9E]/30 rounded-lg text-xs space-y-2 mt-2 shadow">
                <div className="font-bold text-[#1F4E9E] flex items-center justify-between">
                  <span>Detected Structured Telemetry:</span>
                  <span className="text-[10px] text-[var(--ink-soft)] font-mono">Confidence: 95%</span>
                </div>
                <div className="space-y-1">
                  {nlpResult.extracted_events?.map((evt: DisruptionEvent, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-[var(--ink)] bg-[#1F4E9E]/5 px-2 py-1 rounded">
                      <span className="w-2 h-2 rounded-full bg-[#1F4E9E]"></span>
                      <span className="font-mono text-[#1F4E9E] font-bold">{evt.type}</span>
                      <span>{evt.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL TRAIN DELAY */}
        {activeTab === 'train' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[var(--ink-soft)] block mb-1 font-medium">Target Train:</label>
                <select
                  value={selectedTrainNum}
                  onChange={(e) => setSelectedTrainNum(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line)] rounded-lg p-2 text-[var(--ink)] text-xs focus:outline-none focus:border-amber-500 shadow-sm"
                >
                  {trains.map((t) => (
                    <option key={t.id} value={t.train_number}>
                      {t.train_number} - {t.name} (Sched: {t.scheduled_arrival})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[var(--ink-soft)] block mb-1 font-medium">Inbound Delay (Minutes):</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  step={5}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line)] rounded-lg p-2 text-[var(--ink)] text-xs font-mono focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[var(--ink-soft)] block mb-1 text-xs font-medium">Operational Reason / Root Cause:</label>
              <input
                type="text"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="e.g. Signal failure in block section / Loco breakdown"
                className="w-full bg-white dark:bg-slate-900 border border-[var(--line)] rounded-lg p-2 text-[var(--ink)] text-xs focus:outline-none focus:border-amber-500 shadow-sm"
              />
            </div>

            <button
              onClick={() => onApplyDelay(selectedTrainNum, delayMinutes, delayReason)}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-[#E08A1E] hover:bg-[#c97510] text-white font-bold rounded-lg transition-colors shadow"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Inject +{delayMinutes}m Delay on Train {selectedTrainNum}
            </button>
          </div>
        )}

        {/* TAB 3: PLATFORM CLOSURE */}
        {activeTab === 'platform' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[var(--ink-soft)] block mb-1 font-medium">Platform:</label>
                <select
                  value={closurePlatform}
                  onChange={(e) => setClosurePlatform(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line)] rounded-lg p-2 text-[var(--ink)] text-xs shadow-sm"
                >
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <option key={p} value={p}>Platform {p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[var(--ink-soft)] block mb-1 font-medium">Start Time:</label>
                <input
                  type="time"
                  value={closureStart}
                  onChange={(e) => setClosureStart(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line)] rounded-lg p-2 text-[var(--ink)] text-xs font-mono shadow-sm"
                />
              </div>

              <div>
                <label className="text-[var(--ink-soft)] block mb-1 font-medium">End Time:</label>
                <input
                  type="time"
                  value={closureEnd}
                  onChange={(e) => setClosureEnd(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-[var(--line)] rounded-lg p-2 text-[var(--ink)] text-xs font-mono shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[var(--ink-soft)] block mb-1 text-xs font-medium">Blockade Reason:</label>
              <input
                type="text"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                placeholder="e.g. Catenary wire snap / Track fracture"
                className="w-full bg-white dark:bg-slate-900 border border-[var(--line)] rounded-lg p-2 text-[var(--ink)] text-xs shadow-sm"
              />
            </div>

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
              className="w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-[#C9352B] hover:bg-[#a5261d] text-white font-bold rounded-lg transition-colors shadow"
            >
              <Ban className="w-3.5 h-3.5" />
              Declare Platform {closurePlatform} Closed ({closureStart} - {closureEnd})
            </button>

            {/* Active Closures List */}
            {closures.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                <span className="text-[10px] text-[var(--ink-soft)] font-mono font-bold">ACTIVE BLOCKADES:</span>
                {closures.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-2.5 py-1.5 rounded-lg text-xs">
                    <div>
                      <span className="font-bold text-rose-700 dark:text-rose-300">PF {c.platform_number}</span>
                      <span className="text-[var(--ink)] ml-2 font-mono font-medium">{c.start_time}-{c.end_time}</span>
                      <span className="text-[var(--ink-soft)] text-[11px] block">{c.reason}</span>
                    </div>
                    <button
                      onClick={() => onRemoveClosure(c.id)}
                      title="Reopen Platform"
                      className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 rounded text-rose-700 dark:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BENCHMARK PRESETS */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-2">
            <div className="text-xs text-[var(--ink-soft)]">
              Load official hackathon benchmark scenarios for immediate stress-testing and algorithm demonstration:
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => onLoadBenchmark('BENCHMARK-NOMINAL')}
                className="w-full text-left p-2.5 rounded-lg bg-white/70 dark:bg-slate-800 hover:bg-white border border-[var(--line)] transition-colors flex items-center justify-between shadow-sm"
              >
                <div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">1. Nominal Timetable Baseline</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">12 trains across 6 platforms, dispute-free nominal operations.</div>
                </div>
                <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              </button>

              <button
                onClick={() => onLoadBenchmark('BENCHMARK-P2-CLOSURE')}
                className="w-full text-left p-2.5 rounded-lg bg-white/70 dark:bg-slate-800 hover:bg-white border border-[var(--line)] transition-colors flex items-center justify-between shadow-sm"
              >
                <div>
                  <div className="font-bold text-rose-700 dark:text-rose-400 text-xs">2. Platform 2 Emergency Rail Fracture</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">Closure of PF 2 from 08:00 to 10:30; displaces Rajdhani & Shatabdi.</div>
                </div>
                <PlayCircle className="w-4 h-4 text-rose-600 shrink-0" />
              </button>

              <button
                onClick={() => onLoadBenchmark('BENCHMARK-FOG-CASCADE')}
                className="w-full text-left p-2.5 rounded-lg bg-white/70 dark:bg-slate-800 hover:bg-white border border-[var(--line)] transition-colors flex items-center justify-between shadow-sm"
              >
                <div>
                  <div className="font-bold text-amber-700 dark:text-amber-400 text-xs">3. Cascading Fog Inbound Wave</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">Simultaneous delays on Vande Bharat (+35m), Rajdhani (+20m), Duronto (+45m).</div>
                </div>
                <PlayCircle className="w-4 h-4 text-amber-600 shrink-0" />
              </button>

              <button
                onClick={() => onLoadBenchmark('BENCHMARK-COMPOUND-OHE')}
                className="w-full text-left p-2.5 rounded-lg bg-white/70 dark:bg-slate-800 hover:bg-white border border-[var(--line)] transition-colors flex items-center justify-between shadow-sm"
              >
                <div>
                  <div className="font-bold text-[#1F4E9E] dark:text-cyan-400 text-xs">4. Severe OHE Catenary Snap on PF 1</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">Power cut on PF 1 with two delayed 24-coach heavy rakes.</div>
                </div>
                <PlayCircle className="w-4 h-4 text-[#1F4E9E] shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
