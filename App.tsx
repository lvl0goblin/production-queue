
import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectStatus, ScheduleEntry, SchedulerState } from './types';
import { runScheduler } from './engine';
import { PROJECT_COLORS, SESSIONS_PER_DAY, COOLDOWN } from './constants';
import GanttChart from './components/GanttChart';
import ProjectForm from './components/ProjectForm';

const STORAGE_KEY = 'shop_floor_scheduler_v4';

const App: React.FC = () => {
  const [state, setState] = useState<SchedulerState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      projects: [],
      statuses: [],
      schedule: [],
      currentDay: 1,
      startDate: new Date().toISOString(),
      completedUnitKeys: [],
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects'>('dashboard');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const handleReschedule = useCallback(() => {
    const { schedule, error: schedError } = runScheduler(state.projects, state.statuses, state.currentDay);
    setState(prev => ({ ...prev, schedule }));
    setError(schedError || null);
  }, [state.projects, state.statuses, state.currentDay]);

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
    setActiveTab('dashboard');
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

  const saveProgress = () => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl font-black uppercase text-xs tracking-widest z-[200] border border-slate-700 animate-in fade-in slide-in-from-bottom-4';
    toast.innerHTML = '<i class="fas fa-save text-blue-400 mr-3"></i> Progress Saved';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const advanceToNextDay = () => {
    const updatedStatuses = [...state.statuses];
    const todaySchedule = state.schedule.filter(s => s.day === state.currentDay);
    
    // Grouping logic to identify atomic units from today's schedule
    const atomicUnits: { projectId: string; subName: string; start: number; end: number }[] = [];
    todaySchedule.forEach(entry => {
      const last = atomicUnits[atomicUnits.length - 1];
      if (last && last.projectId === entry.projectId && last.subName === entry.subproductName && entry.session === last.end + 1) {
        last.end = entry.session;
      } else {
        atomicUnits.push({ projectId: entry.projectId, subName: entry.subproductName, start: entry.session, end: entry.session });
      }
    });

    // Calculate preliminary updated statuses
    atomicUnits.forEach(unit => {
      const unitKey = `${unit.projectId}-${unit.subName}-${unit.start}`;
      if (state.completedUnitKeys.includes(unitKey)) {
        const statusIdx = updatedStatuses.findIndex(
          s => s.projectId === unit.projectId && s.subproductName === unit.subName
        );
        if (statusIdx !== -1) {
          updatedStatuses[statusIdx].unitsRemaining = Math.max(0, updatedStatuses[statusIdx].unitsRemaining - 1);
          const globalFinish = (state.currentDay - 1) * SESSIONS_PER_DAY + unit.end;
          updatedStatuses[statusIdx].moldReadySession = globalFinish + COOLDOWN;
        }
      }
    });

    const nextDay = state.currentDay + 1;
    const { schedule: nextSchedule, error: schedError } = runScheduler(state.projects, updatedStatuses, nextDay);

    // CRITICAL VALIDATION: If the projected schedule misses a deadline, block the shift transition.
    if (schedError && schedError.toLowerCase().includes("deadline")) {
      setError(schedError);
      alert(`CRITICAL ALERT: ${schedError}. You cannot start the next shift until you complete more tasks today to satisfy delivery deadlines.`);
      return;
    }

    setState(prev => ({
      ...prev,
      currentDay: nextDay,
      statuses: updatedStatuses,
      schedule: nextSchedule,
      completedUnitKeys: [] 
    }));
    setError(null);
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
      }
    });
  };

  const currentDate = new Date(new Date(state.startDate).getTime() + (state.currentDay - 1) * 86400000);

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden">
      <header className="bg-slate-900 text-white p-5 shadow-2xl flex justify-between items-center sticky top-0 z-[100] border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg">
            <i className="fas fa-industry text-lg"></i>
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Production <span className="text-blue-400">Queue</span></h1>
        </div>
        
        <div className="bg-slate-800 px-6 py-2.5 rounded-2xl border border-slate-700 flex flex-col items-center">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 text-center">Live Production Date</span>
          <span className="font-mono font-black text-blue-400 text-sm whitespace-nowrap">
             {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col p-6 gap-3">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
          >
            <i className="fas fa-stream"></i> Production Hub
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${activeTab === 'projects' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
          >
            <i className="fas fa-database"></i> Specs & Units
          </button>
          
          <div className="mt-auto pt-8 border-t border-slate-100">
             <ProjectForm onAdd={addProject} availableColors={PROJECT_COLORS} />
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-10">
          {error && (
            <div className="mb-10 bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl shadow-sm flex items-start gap-5 animate-in slide-in-from-top-4">
              <div className="bg-red-500 text-white w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div>
                <h3 className="text-red-900 font-black uppercase text-xs tracking-widest">Constraint Alert</h3>
                <p className="text-red-700 font-medium text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-10 max-w-[1700px] mx-auto pb-20">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-10">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="px-4 py-1.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">Shift Window Open</div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Day {state.currentDay} Command</h2>
                    </div>
                    <p className="text-slate-500 text-lg font-medium">Finalizing will check for future deadline viability before advancing.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-5 w-full xl:w-auto">
                  <button 
                    onClick={saveProgress}
                    className="flex-1 xl:flex-none px-8 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"
                  >
                    <i className="fas fa-save mr-3"></i> Save State
                  </button>
                  <button 
                    onClick={advanceToNextDay}
                    className="flex-1 xl:flex-none px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 group"
                  >
                    <i className="fas fa-calendar-check text-blue-400"></i>
                    Finalize & Next Day
                  </button>
                </div>
              </div>

              <GanttChart 
                schedule={state.schedule} 
                currentDay={state.currentDay} 
                startDate={state.startDate}
                completedUnitKeys={state.completedUnitKeys}
                onToggleUnit={toggleUnitCompletion}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-4 uppercase text-xs tracking-widest">
                        <i className="fas fa-chart-line text-blue-500"></i> Fulfillment Health
                    </h3>
                    <div className="space-y-6">
                        {state.projects.map(p => {
                            const stats = state.statuses.filter(s => s.projectId === p.id);
                            const totalUnits = p.totalDemand * Object.keys(p.subTimes).length;
                            const remaining = stats.reduce((acc, s) => acc + s.unitsRemaining, 0);
                            const progress = totalUnits > 0 ? Math.round(((totalUnits - remaining) / totalUnits) * 100) : 0;
                            
                            return (
                                <div key={p.id}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{p.name}</span>
                                        <span className="text-xs font-black text-slate-400">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="h-full transition-all duration-1000 ease-out rounded-full" 
                                            style={{ width: `${progress}%`, backgroundColor: p.color }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl text-white flex flex-col justify-center">
                    <div className="flex items-center gap-5 mb-5">
                       <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                         <i className="fas fa-shield-alt text-blue-400 text-2xl"></i>
                       </div>
                       <h3 className="text-2xl font-black text-white tracking-tighter">Deadline Safety</h3>
                    </div>
                    <p className="text-slate-400 font-medium text-lg leading-relaxed">
                      If your current progress puts a future project at risk, the system will prevent you from moving to the next shift until the required work is marked as finished.
                    </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-10">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Project Database</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {state.projects.map(p => (
                        <div key={p.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-2xl transition-all">
                            <div className="h-2.5" style={{ backgroundColor: p.color }}></div>
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{p.name}</h3>
                                    <button onClick={() => deleteProject(p.id)} className="text-slate-300 hover:text-red-500 transition-all"><i className="fas fa-trash-alt"></i></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sets Ordered</span>
                                        <span className="font-black text-slate-900 text-lg">{p.totalDemand}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Delivery Target</span>
                                        <span className="font-black text-slate-900 text-lg">Day {p.deadline}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;