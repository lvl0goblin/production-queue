
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

  const resetAllData = () => {
    if (window.confirm("CRITICAL ACTION: This will permanently wipe all projects and schedule data. Are you sure?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
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
          const globalFinish = (state.currentDay - 1) * SESSIONS_PER_DAY + unit.end;
          updatedStatuses[statusIdx].moldReadySession = globalFinish + COOLDOWN;
        }
      }
    });

    const nextDay = state.currentDay + 1;
    const { schedule: nextSchedule, error: schedError } = runScheduler(state.projects, updatedStatuses, nextDay);

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
    <div className="min-h-screen flex flex-col font-sans overflow-hidden bg-slate-50">
      {/* Dynamic Header */}
      <header className="bg-slate-900 text-white p-3 sm:p-5 shadow-2xl flex flex-col sm:flex-row justify-between items-center sticky top-0 z-[100] border-b border-slate-800 gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fas fa-industry text-sm sm:text-lg"></i>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tighter uppercase">Production <span className="text-blue-400">Queue</span></h1>
          </div>
          
          <div className="flex items-center gap-2 lg:hidden">
            <button 
              onClick={resetAllData}
              className="w-8 h-8 flex items-center justify-center bg-slate-800 text-red-400 rounded-lg border border-slate-700 active:scale-95 transition-all"
              title="Reset System"
            >
              <i className="fas fa-power-off text-xs"></i>
            </button>
            <ProjectForm onAdd={addProject} availableColors={PROJECT_COLORS} variant="minimal" />
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none bg-slate-800 px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-700 flex flex-col items-center">
            <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5 sm:mb-1 text-center text-nowrap">Live Shift Date</span>
            <span className="font-mono font-black text-blue-400 text-xs sm:text-sm whitespace-nowrap">
               {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <ProjectForm onAdd={addProject} availableColors={PROJECT_COLORS} variant="minimal" />
            <button 
              onClick={resetAllData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <i className="fas fa-power-off"></i>
              Reset
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
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
        </nav>

        <main className="flex-1 overflow-y-auto p-4 sm:p-10">
          {/* Mobile Tab Swiper */}
          <div className="lg:hidden flex bg-white p-1 rounded-2xl border border-slate-200 mb-6 shadow-sm">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
            >
              Hub
            </button>
            <button 
              onClick={() => setActiveTab('projects')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'projects' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
            >
              Specs
            </button>
          </div>

          {error && (
            <div className="mb-6 sm:mb-10 bg-red-50 border-l-4 border-red-500 p-4 sm:p-6 rounded-2xl shadow-sm flex items-start gap-4 sm:gap-5 animate-in slide-in-from-top-4">
              <div className="bg-red-500 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30">
                <i className="fas fa-exclamation-triangle text-sm sm:text-base"></i>
              </div>
              <div>
                <h3 className="text-red-900 font-black uppercase text-[10px] sm:text-xs tracking-widest">Constraint Alert</h3>
                <p className="text-red-700 font-medium text-xs sm:text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6 sm:space-y-10 max-w-[1700px] mx-auto pb-20">
              {/* Action Hub */}
              <div className="bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 sm:gap-10">
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-blue-200">Shift Window Open</div>
                      <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter">Day {state.currentDay} Command</h2>
                    </div>
                    <p className="text-slate-500 text-sm sm:text-lg font-medium">Finalize today's production before moving to the next shift.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 w-full xl:w-auto">
                  <div className="hidden sm:block">
                    <ProjectForm onAdd={addProject} availableColors={PROJECT_COLORS} variant="outlined" />
                  </div>
                  <button 
                    onClick={advanceToNextDay}
                    className="flex-1 xl:flex-none px-6 py-4 sm:px-10 sm:py-5 bg-slate-900 text-white rounded-2xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-[11px] tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 sm:gap-4 group"
                  >
                    <i className="fas fa-calendar-check text-blue-400"></i>
                    Next Day
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
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                <div className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] shadow-sm border border-slate-200">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-4 uppercase text-[10px] sm:text-xs tracking-widest">
                        <i className="fas fa-chart-line text-blue-500"></i> Fulfillment Health
                    </h3>
                    <div className="space-y-6">
                        {state.projects.length === 0 ? (
                          <p className="text-slate-400 text-sm font-bold italic">No active projects to track.</p>
                        ) : state.projects.map(p => {
                            const stats = state.statuses.filter(s => s.projectId === p.id);
                            const totalUnits = p.totalDemand * Object.keys(p.subTimes).length;
                            const remaining = stats.reduce((acc, s) => acc + s.unitsRemaining, 0);
                            const progress = totalUnits > 0 ? Math.round(((totalUnits - remaining) / totalUnits) * 100) : 0;
                            
                            return (
                                <div key={p.id}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700 text-sm">{p.name}</span>
                                        <span className="text-xs font-black text-slate-400">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 sm:h-3 overflow-hidden">
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

                <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] shadow-2xl text-white flex flex-col justify-center">
                    <div className="flex items-center gap-4 sm:gap-5 mb-4 sm:mb-5">
                       <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                         <i className="fas fa-shield-alt text-blue-400 text-xl sm:text-2xl"></i>
                       </div>
                       <h3 className="text-xl sm:text-2xl font-black text-white tracking-tighter">Deadline Safety</h3>
                    </div>
                    <p className="text-slate-400 font-medium text-sm sm:text-lg leading-relaxed">
                      If your current progress puts a future project at risk, the system will prevent you from moving to the next shift.
                    </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6 sm:space-y-10 pb-20">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter">Project Database</h2>
                  <div className="hidden sm:block">
                    <ProjectForm onAdd={addProject} availableColors={PROJECT_COLORS} variant="outlined" />
                  </div>
                </div>
                {state.projects.length === 0 ? (
                  <div className="bg-white p-12 sm:p-20 rounded-[3rem] border border-dashed border-slate-200 text-center">
                    <i className="fas fa-box-open text-5xl text-slate-100 mb-6"></i>
                    <p className="text-slate-400 font-bold">Your project database is empty.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                      {state.projects.map(p => (
                          <div key={p.id} className="bg-white rounded-3xl sm:rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-2xl transition-all">
                              <div className="h-2" style={{ backgroundColor: p.color }}></div>
                              <div className="p-