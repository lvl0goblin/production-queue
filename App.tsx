import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectStatus, SchedulerState, ScheduleEntry } from './types';
import { runScheduler } from './engine';
import { PROJECT_COLORS, SESSIONS_PER_DAY } from './constants';
import GanttChart from './components/GanttChart';
import ProjectForm from './components/ProjectForm';

const STORAGE_KEY = 'flowcore_mobile_v2';

const App: React.FC = () => {
  const [state, setState] = useState<SchedulerState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as SchedulerState;
      } catch (e) {
        console.error("Failed to parse stored shop state", e);
      }
    }
    return {
      projects: [],
      statuses: [],
      schedule: [],
      currentDay: 1,
      startDate: new Date().toISOString(),
      completedUnitKeys: [],
    };
  });

  const [activeTab, setActiveTab] = useState<'hub' | 'specs' | 'analytics'>('hub');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addProject = (p: Project) => {
    const newStatuses: ProjectStatus[] = Object.keys(p.subTimes).map(subName => ({
      projectId: p.id,
      subproductName: subName,
      unitsRemaining: p.totalDemand,
      moldReadySession: 0,
    }));

    setState(prev => {
      const updatedProjects = [...prev.projects, p];
      const updatedStatuses = [...prev.statuses, ...newStatuses];
      const { schedule, error: schedError } = runScheduler(updatedProjects, updatedStatuses, prev.currentDay);
      setError(schedError || null);
      return {
        ...prev,
        projects: updatedProjects,
        statuses: updatedStatuses,
        schedule: schedule
      };
    });
    setActiveTab('hub');
  };

  const toggleUnitCompletion = (unitKey: string) => {
    setState(prev => {
      const isCompleted = prev.completedUnitKeys.includes(unitKey);
      const newKeys = isCompleted 
        ? prev.completedUnitKeys.filter(k => k !== unitKey)
        : [...prev.completedUnitKeys, unitKey];
      return { ...prev, completedUnitKeys: newKeys };
    });
  };

  const advanceToNextDay = () => {
    const updatedStatuses = [...state.statuses];
    const todaySchedule = state.schedule.filter(s => s.day === state.currentDay);
    
    const atomicUnits: { projectId: string; subName: string; start: number; end: number }[] = [];
    todaySchedule.forEach(entry => {
      const last = atomicUnits[atomicUnits.length - 1];
      if (last && last.projectId === entry.projectId && last.subName === entry.subproductName && entry.session === last.end + 1) {
        last.end = entry.session;
      } else {
        atomicUnits.push({ projectId: entry.projectId, subName: entry.subproductName, start: entry.session, end: entry.session });
      }
    });

    atomicUnits.forEach(unit => {
      const unitKey = `${unit.projectId}-${unit.subName}-${unit.start}`;
      if (state.completedUnitKeys.includes(unitKey)) {
        const statusIdx = updatedStatuses.findIndex(
          s => s.projectId === unit.projectId && s.subproductName === unit.subName
        );
        if (statusIdx !== -1) {
          updatedStatuses[statusIdx].unitsRemaining = Math.max(0, updatedStatuses[statusIdx].unitsRemaining - 1);
        }
      }
    });

    const completedProjectIds = state.projects
      .filter(p => {
        const projectStatuses = updatedStatuses.filter(s => s.projectId === p.id);
        return projectStatuses.length > 0 && projectStatuses.every(s => s.unitsRemaining === 0);
      })
      .map(p => p.id);

    const finalProjects = state.projects.filter(p => !completedProjectIds.includes(p.id));
    const finalStatuses = updatedStatuses.filter(s => !completedProjectIds.includes(s.projectId));

    const nextDay = state.currentDay + 1;
    const { schedule: nextSchedule, error: schedError } = runScheduler(finalProjects, finalStatuses, nextDay);

    if (schedError) {
      setError(schedError);
      return;
    }

    setState(prev => ({
      ...prev,
      currentDay: nextDay,
      projects: finalProjects,
      statuses: finalStatuses,
      schedule: nextSchedule,
      completedUnitKeys: [] 
    }));
    setError(null);
  };

  const exportDailySchedule = () => {
    const todayEntries = state.schedule.filter(s => s.day === state.currentDay);
    if (todayEntries.length === 0) {
      alert("Nothing scheduled for today.");
      return;
    }

    // Consolidated units logic for CSV
    const consolidated: any[] = [];
    todayEntries.forEach(entry => {
      const last = consolidated[consolidated.length - 1];
      if (last && last.projectId === entry.projectId && last.subName === entry.subproductName && entry.session === last.end + 1) {
        last.end = entry.session;
      } else {
        consolidated.push({
          start: entry.session,
          end: entry.session,
          projectId: entry.projectId,
          projectName: entry.projectName,
          subName: entry.subproductName
        });
      }
    });

    let csvContent = "Start Session,End Session,Project,Operation\n";
    consolidated.forEach(row => {
      csvContent += `${row.start},${row.end},"${row.projectName}","${row.subName}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FlowCore_Day_${state.currentDay}_Schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteProject = (id: string) => {
    setState(prev => {
      const updatedProjects = prev.projects.filter(p => p.id !== id);
      const updatedStatuses = prev.statuses.filter(s => s.projectId !== id);
      const { schedule, error: schedError } = runScheduler(updatedProjects, updatedStatuses, prev.currentDay);
      setError(schedError || null);
      return {
        ...prev,
        projects: updatedProjects,
        statuses: updatedStatuses,
        schedule: schedule
      };
    });
  };

  const resetAll = () => {
    if(confirm("Wipe all project data and start over?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const currentDate = useMemo(() => {
    const d = new Date(state.startDate);
    d.setDate(d.getDate() + (state.currentDay - 1));
    return d;
  }, [state.startDate, state.currentDay]);

  const criticalProjects = useMemo(() => {
    return state.projects.filter(p => {
      const status = state.statuses.find(s => s.projectId === p.id && s.unitsRemaining > 0);
      return status && p.deadline <= state.currentDay;
    });
  }, [state.projects, state.statuses, state.currentDay]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 select-none overflow-hidden touch-none">
      
      {/* Dynamic Header */}
      <header className="flex-none h-24 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 z-50 pt-safe">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Operational Unit</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <h1 className="text-xl font-black tracking-tight italic flex items-baseline gap-2">
            {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            <span className="text-indigo-500 font-mono text-base">DAY {state.currentDay}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportDailySchedule}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 active:scale-90 transition-all"
            title="Download CSV"
          >
            <i className="fas fa-file-export text-sm"></i>
          </button>
          <button 
            onClick={resetAll} 
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-800 text-slate-500 active:text-red-400 border border-slate-700 active:scale-90 transition-all"
          >
            <i className="fas fa-power-off text-sm"></i>
          </button>
        </div>
      </header>

      {/* Primary Viewport */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto custom-scrollbar p-5 pb-40 touch-pan-y">
          
          {activeTab === 'hub' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              
              {/* Alert System */}
              {(error || criticalProjects.length > 0) && (
                <div className="space-y-3">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-3xl flex items-center gap-4 shadow-lg">
                      <i className="fas fa-triangle-exclamation text-red-500"></i>
                      <p className="text-[11px] font-black text-red-200 uppercase leading-snug">{error}</p>
                    </div>
                  )}
                  {criticalProjects.map(p => (
                    <div key={p.id} className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-3xl flex items-center gap-4 shadow-lg">
                      <i className="fas fa-stopwatch text-amber-500"></i>
                      <p className="text-[11px] font-black text-amber-200 uppercase leading-snug">{p.name} DEADLINE EXPIRED</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              <div className="bg-indigo-600/10 border-2 border-indigo-600/20 p-6 rounded-[2.5rem] flex items-center justify-between gap-6 shadow-2xl shadow-indigo-950/20">
                <div className="flex-1">
                  <h3 className="text-xs font-black uppercase text-white tracking-[0.2em] mb-1">Shift Progression</h3>
                  <p className="text-[10px] text-indigo-300/60 font-bold leading-tight">Advance to next operational session</p>
                </div>
                <button 
                  onClick={advanceToNextDay}
                  className="bg-indigo-600 active:bg-indigo-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/40 active:scale-[0.93] transition-all"
                >
                  Start Day
                </button>
              </div>

              {/* Data Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-[2rem] shadow-lg">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Slots</span>
                  <div className="text-4xl font-black text-white mt-2 font-mono">
                    {state.schedule.filter(s => s.day === state.currentDay).length}
                  </div>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-[2rem] shadow-lg">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Project Load</span>
                  <div className="text-4xl font-black text-white mt-2 font-mono">{state.projects.length}</div>
                </div>
              </div>

              {/* Gantt Area */}
              <div className="h-[60vh] w-full relative">
                <GanttChart 
                  schedule={state.schedule} 
                  currentDay={state.currentDay} 
                  startDate={state.startDate}
                  completedUnitKeys={state.completedUnitKeys}
                  onToggleUnit={toggleUnitCompletion}
                />
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter ml-2">Project Queue</h2>

              {state.projects.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center opacity-30 text-center px-10">
                  <i className="fas fa-microchip text-7xl mb-6"></i>
                  <p className="text-sm font-black uppercase tracking-[0.3em] leading-relaxed">No active blueprints detected in system</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.projects.map(p => (
                    <div key={p.id} className="bg-slate-900/60 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden group">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/5" style={{ backgroundColor: p.color }}></div>
                          <h4 className="font-black text-xl tracking-tight text-white">{p.name}</h4>
                        </div>
                        <button 
                          onClick={() => confirm(`Wipe project ${p.name}?`) && deleteProject(p.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500/50 active:text-red-500"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                          <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Batch Size</span>
                          <span className="text-base font-black text-white">{p.totalDemand} PC</span>
                        </div>
                        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                          <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Target End</span>
                          <span className="text-base font-black text-indigo-400">DAY {p.deadline}</span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-800/50">
                        {Object.entries(p.subTimes).map(([name, time]) => {
                          const status = state.statuses.find(s => s.projectId === p.id && s.subproductName === name);
                          const remaining = status ? status.unitsRemaining : 0;
                          const progress = ((p.totalDemand - remaining) / p.totalDemand) * 100;
                          return (
                            <div key={name} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Step: {name}</span>
                                <span className="text-indigo-400">{remaining} Pending</span>
                              </div>
                              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-30">
              <div className="w-24 h-24 border-4 border-slate-800 rounded-full flex items-center justify-center border-t-indigo-500 animate-spin">
                 <i className="fas fa-database text-4xl"></i>
              </div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-[0.5em]">Syncing Nodes...</p>
            </div>
          )}

        </div>
      </main>

      {/* FIXED BOTTOM NAVIGATION - CENTERED PLUS */}
      <nav className="flex-none h-28 bg-slate-900 border-t border-slate-800/50 relative shadow-[0_-20px_40px_rgba(0,0,0,0.5)] z-[100] pb-safe">
        <div className="grid grid-cols-5 h-full items-center px-4">
          
          <button 
            onClick={() => setActiveTab('hub')}
            className={`col-span-2 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'hub' ? 'text-indigo-400 scale-110' : 'text-slate-600'}`}
          >
            <i className="fas fa-layer-group text-2xl"></i>
            <span className="text-[9px] font-black uppercase tracking-widest">Command</span>
          </button>

          {/* ABSOLUTE CENTER BUTTON AREA */}
          <div className="flex justify-center -mt-10">
             <ProjectForm onAdd={addProject} availableColors={PROJECT_COLORS} variant="minimal" />
          </div>

          <button 
            onClick={() => setActiveTab('specs')}
            className={`col-span-2 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'specs' ? 'text-indigo-400 scale-110' : 'text-slate-600'}`}
          >
            <i className="fas fa-folder-open text-2xl"></i>
            <span className="text-[9px] font-black uppercase tracking-widest">Assets</span>
          </button>

        </div>
      </nav>
      
    </div>
  );
};

export default App;