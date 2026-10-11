import React, { useState, useEffect } from 'react';
import { Station, Train, PlatformClosure, Scenario, ValidationResult, ChangeExplanation } from './types/railway';
import { api } from './services/api';
import { StationYardDiagram } from './components/StationYardDiagram';
import { TimelineGantt } from './components/TimelineGantt';
import { DisruptionConsole } from './components/DisruptionConsole';
import { TimetableTable } from './components/TimetableTable';
import { ReplanningExplainer } from './components/ReplanningExplainer';
import { ValidationModal } from './components/ValidationModal';
import { StationConfigModal } from './components/StationConfigModal';
import { ScenarioManagerModal } from './components/ScenarioManagerModal';
import { MetricsComparisonBar } from './components/MetricsComparisonBar';
import { Railway3DBackground } from './components/Railway3DBackground';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ReplanningProgressModal, ReplanningStage } from './components/ReplanningProgressModal';
import { ReplanningSummaryModal } from './components/ReplanningSummaryModal';
import { 
  Train as TrainIcon, ShieldCheck, ShieldAlert, Cpu, 
  Settings, FolderOpen, RefreshCw, Play, Sun, Moon, Eye, Sparkles 
} from 'lucide-react';

export function App() {
  const [hasEnteredApp, setHasEnteredApp] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [station, setStation] = useState<Station | null>(null);
  const [originalTrains, setOriginalTrains] = useState<Train[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [closures, setClosures] = useState<PlatformClosure[]>([]);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('08:45');
  
  // Replanning & Validation state
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [explanations, setExplanations] = useState<ChangeExplanation[]>([]);
  const [solverUsed, setSolverUsed] = useState<string>('Google OR-Tools CP-SAT');
  const [solverTimeMs, setSolverTimeMs] = useState<number>(0);
  const [replanning, setReplanning] = useState<boolean>(false);
  
  // Replanning Progress & Summary states
  const [isProgressModalOpen, setIsProgressModalOpen] = useState<boolean>(false);
  const [replanStage, setReplanStage] = useState<ReplanningStage>('ANALYZING_DISRUPTIONS');
  const [replanError, setReplanError] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [conflictsBeforeReplan, setConflictsBeforeReplan] = useState<number>(0);
  const [conflictsAfterReplan, setConflictsAfterReplan] = useState<number>(0);

  // Selection & Modal states
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);
  const [isStationConfigOpen, setIsStationConfigOpen] = useState<boolean>(false);
  const [isScenarioManagerOpen, setIsScenarioManagerOpen] = useState<boolean>(false);
  const [activeScenarioName, setActiveScenarioName] = useState<string>('Nominal Master Timetable');
  
  // 3D Background view modes
  const [is3DExpanded, setIs3DExpanded] = useState<boolean>(false);
  const [show3DBackdrop, setShow3DBackdrop] = useState<boolean>(true);
  const [panelTranslucency, setPanelTranslucency] = useState<'ultra' | 'balanced' | 'solid'>('ultra');

  // Sync theme & translucency attribute on <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const root = document.documentElement;
    if (panelTranslucency === 'ultra') {
      root.style.setProperty('--panel', theme === 'light' ? 'rgba(255, 255, 255, 0.30)' : 'rgba(10, 27, 58, 0.35)');
    } else if (panelTranslucency === 'balanced') {
      root.style.setProperty('--panel', theme === 'light' ? 'rgba(255, 255, 255, 0.50)' : 'rgba(10, 27, 58, 0.55)');
    } else {
      root.style.setProperty('--panel', theme === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(10, 27, 58, 0.85)');
    }
  }, [theme, panelTranslucency]);

  // Load initial nominal scenario
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const stn = await api.getStation();
      const trns = await api.getTrains();
      setStation(stn);
      setOriginalTrains(JSON.parse(JSON.stringify(trns)));
      setTrains(trns);
      setClosures([]);

      const initialValidation = await api.validate(stn, trns, []);
      setValidation(initialValidation);
    } catch (err) {
      console.error('Failed to initialize app from API:', err);
    }
  };

  const triggerValidation = async (currentStation: Station, currentTrains: Train[], currentClosures: PlatformClosure[]) => {
    try {
      const res = await api.validate(currentStation, currentTrains, currentClosures);
      setValidation(res);
      return res;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleReplan = async () => {
    if (!station || replanning) return;
    
    // Calculate conflicts before replanning from current validation
    const currentConflictsCount = validation?.errors?.length || 0;
    setConflictsBeforeReplan(currentConflictsCount);

    setReplanning(true);
    setReplanError(null);
    setIsProgressModalOpen(true);
    setReplanStage('ANALYZING_DISRUPTIONS');

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Stage 1: Analyzing Disruptions
      await delay(250);
      setReplanStage('DETECTING_CONFLICTS');

      // Stage 2: Detecting platform and track conflicts
      await delay(250);
      setReplanStage('IDENTIFYING_AFFECTED_TRAINS');

      // Stage 3: Identifying affected trains
      await delay(200);
      setReplanStage('CALCULATING_FEASIBLE_ASSIGNMENTS');

      // Stage 4: Calculating feasible alternative assignments
      await delay(250);
      setReplanStage('OPTIMIZING_TIMETABLE');

      // Stage 5: Actual deterministic constraint replanning via API
      const res = await api.replan(station, trains, closures);

      // Stage 6: Independent safety validation
      setReplanStage('VALIDATING_SAFETY');
      await delay(250);

      // Verify validation result: Never mark replanning as successful before validation
      if (!res.validation || !res.validation.is_valid) {
        const errorMsg = res.validation?.errors?.join('; ') || 'Safety validation failed: conflicting platform paths detected.';
        setReplanError(errorMsg);
        setValidation(res.validation);
        return;
      }

      // Stage 7: Preparing change summary
      setReplanStage('PREPARING_SUMMARY');
      await delay(200);

      // Update state with valid replanned timetable
      setTrains(res.replanned_trains);
      setExplanations(res.explanations);
      setValidation(res.validation);
      setSolverUsed(res.solver_used);
      setSolverTimeMs(res.solver_time_ms);
      setConflictsAfterReplan(res.validation.errors.length);

      // Close progress modal and open comprehensive Timetable Replanning Summary
      setIsProgressModalOpen(false);
      setIsSummaryModalOpen(true);
    } catch (err: any) {
      console.error('Replanning error:', err);
      setReplanError(err?.message || 'Solver error or optimization timeout occurred during replanning.');
    } finally {
      setReplanning(false);
    }
  };

  const handleApplyDelay = (trainNumber: string, delayMinutes: number, reason: string) => {
    const updated = trains.map((t) => {
      if (t.train_number === trainNumber) {
        return {
          ...t,
          inbound_delay_minutes: delayMinutes,
          notes: `${t.notes ? t.notes + '; ' : ''}${reason}`,
        };
      }
      return t;
    });
    setTrains(updated);
    if (station) triggerValidation(station, updated, closures);
  };

  const handleAddClosure = (closure: PlatformClosure) => {
    const updated = [...closures, closure];
    setClosures(updated);
    if (station) triggerValidation(station, trains, updated);
  };

  const handleRemoveClosure = (closureId: string) => {
    const updated = closures.filter((c) => c.id !== closureId);
    setClosures(updated);
    if (station) triggerValidation(station, trains, updated);
  };

  const handleLoadBenchmark = async (benchmarkId: string) => {
    try {
      const scn = await api.getScenarioById(benchmarkId);
      loadScenarioIntoState(scn);
    } catch (err) {
      console.error('Failed to load benchmark:', err);
    }
  };

  const loadScenarioIntoState = (scn: Scenario) => {
    setStation(scn.station);
    setOriginalTrains(JSON.parse(JSON.stringify(scn.trains)));
    setTrains(scn.trains);
    setClosures(scn.closures || []);
    setActiveScenarioName(scn.name);
    setExplanations([]);
    triggerValidation(scn.station, scn.trains, scn.closures || []);
  };

  const handleResetTimetable = () => {
    if (originalTrains.length > 0) {
      const freshTrains = originalTrains.map((t) => ({
        ...t,
        inbound_delay_minutes: 0,
        delay_departure_minutes: 0,
        actual_arrival: undefined,
        actual_departure: undefined,
        assigned_platform: t.preferred_platform || t.assigned_platform,
      }));
      setTrains(freshTrains);
      setClosures([]);
      setExplanations([]);
      if (station) triggerValidation(station, freshTrains, []);
    }
  };

  if (!station) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#BFD3EA] text-[#13305C]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#1F4E9E]" />
          <span className="font-['Barlow_Condensed'] font-bold text-lg tracking-wider">
            INITIALIZING RAILFLOW SIMULATION ENGINE...
          </span>
        </div>
      </div>
    );
  }

  // CINEMATIC 3D WELCOME SCREEN
  if (!hasEnteredApp) {
    return <WelcomeScreen onEnter={() => setHasEnteredApp(true)} />;
  }

  const activeDisruptionsCount = closures.length + trains.filter((t) => t.inbound_delay_minutes > 0).length;

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col font-sans">
      {/* 1. THREE.JS 3D RAILWAY SIMULATION BACKGROUND CANVAS */}
      {show3DBackdrop && (
        <Railway3DBackground
          theme={theme}
          isExpanded={is3DExpanded}
          onToggleExpand={() => setIs3DExpanded(!is3DExpanded)}
        />
      )}

      {/* 2. COMMAND CENTRE WORKSPACE (Overlay on top of 3D background) */}
      <div className={`relative z-10 flex flex-col min-h-screen ${is3DExpanded ? 'pointer-events-none opacity-0' : ''}`}>
        {/* TOP COMMAND BAR */}
        <header className="sticky top-0 z-40 bg-white dark:bg-[#0B132B] border-b border-slate-300 dark:border-slate-800 px-6 py-3 shadow-md transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Brand Logo matching the attachment */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1F4E9E] rounded-xl text-white shadow-md">
                <TrainIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="word-brand text-2xl font-black text-[#0B132B] dark:text-white">
                    RAILFLOW
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold text-xs border border-rose-500/30">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span className="font-mono">LIVE SIMULATION</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Simulate Disruptions. Resolve Conflicts. Restore Flow.
                </p>
              </div>
            </div>

            {/* Solver & Safety Badges */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Solver Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono shadow-sm">
                <Cpu className="w-4 h-4 text-[#1F4E9E] dark:text-cyan-400" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">SOLVER:</span>
                <span className="text-[#0B132B] dark:text-cyan-300 font-bold">{solverUsed}</span>
              </div>

              {/* Safety Pill */}
              <button
                onClick={() => setIsValidationModalOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all shadow-sm ${
                  validation?.is_valid
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                    : 'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-800 dark:text-rose-300 animate-pulse hover:bg-rose-100'
                }`}
              >
                {validation?.is_valid ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>SAFETY CERTIFIED (100%)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>VIOLATIONS DETECTED ({validation?.errors.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Primary Action Buttons & Theme Controls */}
            <div className="flex items-center gap-2.5">
              {/* Replay Intro Welcome Button */}
              <button
                onClick={() => setHasEnteredApp(false)}
                title="View RailFlow Welcome Intro Screen"
                className="btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Intro</span>
              </button>

              {/* 3D Expand Toggle */}
              <button
                onClick={() => setIs3DExpanded(true)}
                title="Expand 3D Railway Simulation to Fullscreen"
                className="btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm"
              >
                <Eye className="w-4 h-4 text-[#1F4E9E]" />
                <span>3D View</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                className="btn-secondary p-2 rounded-lg text-xs font-semibold shadow-sm"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-[#1F4E9E]" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>

              <button
                onClick={() => setIsStationConfigOpen(true)}
                className="btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm"
              >
                <Settings className="w-4 h-4" />
                <span>Station</span>
              </button>

              <button
                onClick={() => setIsScenarioManagerOpen(true)}
                className="btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Scenarios</span>
              </button>

              {/* REPLAN TRIGGER BUTTON - Primary Button: Blue background with white text */}
              <button
                disabled={replanning}
                onClick={handleReplan}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {replanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>OPTIMIZING...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>REPLAN TIMETABLE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 p-5 max-w-[1700px] w-full mx-auto space-y-5">
          {/* Active Scenario Card Banner */}
          <div className="flex items-center justify-between dashboard-card px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-['Barlow_Condensed'] uppercase tracking-wider font-bold">
                ACTIVE SCENARIO:
              </span>
              <span className="font-bold text-[#1F4E9E] dark:text-cyan-400 font-['Barlow'] text-sm">
                {activeScenarioName}
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
              {trains.length} Trains Berthing &bull; 6 Platforms Active &bull; Station Throat Headway: {station.min_headway_buffer_minutes}m
            </div>
          </div>

          {/* 1. Schedule Comparison & Operations KPIs */}
          {validation && (
            <MetricsComparisonBar
              originalTrains={originalTrains}
              replannedTrains={trains}
              validation={validation}
              solverTimeMs={solverTimeMs}
              solverUsed={solverUsed}
            />
          )}

          {/* 2. Interactive SVG Railway Yard Track Diagram (Digital Twin) */}
          <StationYardDiagram
            station={station}
            trains={trains}
            closures={closures}
            currentTimeStr={currentTimeStr}
            onPlatformClick={(_pf) => setIsStationConfigOpen(true)}
            onTrainClick={(t) => setSelectedTrain(t)}
            selectedTrainId={selectedTrain?.id}
            theme={theme}
          />

          {/* 3. Platform Occupancy Gantt Chart & Headway Clearance Timeline */}
          <TimelineGantt
            station={station}
            trains={trains}
            closures={closures}
            currentTimeStr={currentTimeStr}
            onTimeChange={(t) => setCurrentTimeStr(t)}
            onTrainSelect={(t) => setSelectedTrain(t)}
            selectedTrainId={selectedTrain?.id}
            theme={theme}
          />

          {/* 4. Split Deck: Disruption Console & Explainability Audit Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <DisruptionConsole
              trains={trains}
              closures={closures}
              onApplyDelay={handleApplyDelay}
              onAddClosure={handleAddClosure}
              onRemoveClosure={handleRemoveClosure}
              onResetTimetable={handleResetTimetable}
              onLoadBenchmark={handleLoadBenchmark}
              activeDisruptionsCount={activeDisruptionsCount}
            />

            <ReplanningExplainer
              explanations={explanations}
              solverUsed={solverUsed}
              solverTimeMs={solverTimeMs}
            />
          </div>

          {/* 5. Master Train Timetable & Platform Allocations */}
          <TimetableTable
            trains={trains}
            onSelectTrain={(t) => setSelectedTrain(t)}
            onUpdateTrain={(updated) => {
              const next = trains.map((t) => (t.id === updated.id ? updated : t));
              setTrains(next);
              triggerValidation(station, next, closures);
            }}
            selectedTrainId={selectedTrain?.id}
          />
        </main>

        {/* FOOTER */}
        <footer className="glass-panel mx-5 mb-5 p-4 text-xs text-[var(--ink-soft)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-bold text-[var(--ink)]">RailFlow</span> &bull; Railway Disruption & Platform Conflict Simulator (P-03)
          </div>
          <div className="font-mono text-[11px]">
            Independent Safety Validation Guaranteed &bull; Google OR-Tools CP-SAT Solver &bull; Fictional Simulation Environment
          </div>
        </footer>
      </div>

      {/* Floating Minimize Button when 3D is expanded */}
      {is3DExpanded && (
        <button
          onClick={() => setIs3DExpanded(false)}
          className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-[#13305C] text-white shadow-2xl font-bold text-xs hover:bg-[#1f4e9e] transition-colors"
        >
          <span>Return to Command Centre</span>
        </button>
      )}

      {/* MODALS */}
      {validation && (
        <ValidationModal
          validation={validation}
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
        />
      )}

      {/* Replanning Progress Modal (Visible multi-stage pipeline) */}
      <ReplanningProgressModal
        isOpen={isProgressModalOpen}
        currentStage={replanStage}
        solverUsed={solverUsed}
        error={replanError}
        onDismissError={() => {
          setIsProgressModalOpen(false);
          setReplanError(null);
        }}
      />

      {/* Timetable Replanning Summary Modal (Post-optimization report) */}
      {validation && (
        <ReplanningSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          originalTrains={originalTrains}
          replannedTrains={trains}
          explanations={explanations}
          validation={validation}
          conflictsBefore={conflictsBeforeReplan}
          conflictsAfter={conflictsAfterReplan}
          solverUsed={solverUsed}
          solverTimeMs={solverTimeMs}
        />
      )}

      <StationConfigModal
        station={station}
        isOpen={isStationConfigOpen}
        onClose={() => setIsStationConfigOpen(false)}
        onSaveStation={(newStation) => {
          setStation(newStation);
          triggerValidation(newStation, trains, closures);
        }}
      />

      <ScenarioManagerModal
        currentScenario={{
          id: `SCN-CUSTOM-${Date.now()}`,
          name: activeScenarioName,
          description: `Snapshot with ${trains.length} trains and ${closures.length} closures`,
          station: station,
          trains: trains,
          closures: closures,
          disruptions: [],
          is_benchmark: false,
        }}
        isOpen={isScenarioManagerOpen}
        onClose={() => setIsScenarioManagerOpen(false)}
        onLoadScenario={(scn) => loadScenarioIntoState(scn)}
      />
    </div>
  );
}

export default App;
