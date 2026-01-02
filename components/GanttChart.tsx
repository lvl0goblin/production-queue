import React, { useState, useMemo, useRef } from 'react';
import { ScheduleEntry } from '../types';
import { SESSIONS_PER_DAY } from '../constants';

interface GanttChartProps {
  schedule: ScheduleEntry[];
  currentDay: number;
  startDate: string;
  completedUnitKeys: string[];
  blockedSessions: number[];
  onToggleUnit: (unitKey: string) => void;
  onManualOverride: (session: number, block: boolean) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ 
  schedule, currentDay, startDate, completedUnitKeys, blockedSessions, onToggleUnit, onManualOverride 
}) => {
  const [zoom, setZoom] = useState(1.1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; session: number; unit?: any } | null>(null);

  const daysToShow = useMemo(() => {
    const maxDay = schedule.length > 0 ? Math.max(...schedule.map(s => s.day), currentDay + 5) : currentDay + 5;
    return Array.from({ length: maxDay - currentDay + 1 }, (_, i) => currentDay + i);
  }, [schedule, currentDay]);

  const grid = useMemo(() => {
    const g: { [key: string]: ScheduleEntry } = {};
    schedule.forEach(item => {
      g[`${item.day}-${item.session}`] = item;
    });
    return g;
  }, [schedule]);

  const getDateForDay = (day: number) => {
    const start = new Date(startDate);
    start.setDate(start.getDate() + (day - 1));
    return start;
  };

  const getDayAtomicUnits = (day: number) => {
    const units: { projectId: string; subName: string; start: number; end: number; color: string; projectName: string }[] = [];
    for (let s = 1; s <= SESSIONS_PER_DAY; s++) {
      const entry = grid[`${day}-${s}`];
      if (!entry) continue;

      const last = units[units.length - 1];
      if (last && last.projectId === entry.projectId && last.subName === entry.subproductName && s === last.end + 1) {
        last.end = s;
      } else {
        units.push({
          projectId: entry.projectId,
          subName: entry.subproductName,
          start: s,
          end: s,
          color: entry.color,
          projectName: entry.projectName
        });
      }
    }
    return units;
  };

  const rowHeight = 90 * zoom;
  const colWidth = 320 * zoom;

  const handleSlotClick = (day: number, session: number) => {
    if (day !== currentDay) return;
    const entry = grid[`${day}-${session}`];
    
    if (entry) {
      // It's a scheduled unit, find its atomic range
      const units = getDayAtomicUnits(day);
      const unit = units.find(u => session >= u.start && session <= u.end);
      setSelectedSlot({ day, session, unit });
    } else {
      setSelectedSlot({ day, session });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/30 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl relative">
      
      {/* Zoom Toolbar */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(Math.max(0.7, zoom - 0.1))} className="w-10 h-10 rounded-xl bg-slate-800 active:scale-90 flex items-center justify-center"><i className="fas fa-minus text-xs"></i></button>
          <div className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-[10px] font-black text-indigo-400">{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(Math.min(1.8, zoom + 0.1))} className="w-10 h-10 rounded-xl bg-slate-800 active:scale-90 flex items-center justify-center"><i className="fas fa-plus text-xs"></i></button>
        </div>
        <button 
          onClick={() => scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })}
          className="px-4 py-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest"
        >
          TODAY
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto custom-scrollbar snap-x-mandatory">
        <div className="inline-block min-w-full">
          <div className="flex">
            
            {/* Session Sidebar */}
            <div className="flex-none w-16 bg-slate-950/90 backdrop-blur-xl sticky left-0 z-40 border-r border-slate-800">
              <div className="h-16 border-b border-slate-800"></div>
              {Array.from({ length: SESSIONS_PER_DAY }, (_, i) => i + 1).map(s => (
                <div key={s} className="flex items-center justify-center border-b border-slate-900/50" style={{ height: `${rowHeight}px` }}>
                   <span className="font-mono text-base font-black text-slate-600 italic">{s}</span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {daysToShow.map(d => {
              const date = getDateForDay(d);
              const isCurrent = d === currentDay;
              const units = getDayAtomicUnits(d);

              return (
                <div key={d} className={`flex-none relative border-r border-slate-800/30 snap-center`} style={{ width: `${colWidth}px` }}>
                  
                  <div className={`h-16 flex flex-col items-center justify-center sticky top-0 z-30 border-b shadow-lg transition-all ${isCurrent ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900/90 backdrop-blur-md text-slate-500 border-slate-800'}`}>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-sm font-black uppercase italic tracking-tighter">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className="relative" style={{ height: `${SESSIONS_PER_DAY * rowHeight}px` }}>
                    {Array.from({ length: SESSIONS_PER_DAY }).map((_, i) => {
                      const sessionNum = i + 1;
                      const isBlocked = isCurrent && blockedSessions.includes(sessionNum);
                      return (
                        <div 
                          key={i} 
                          onClick={() => handleSlotClick(d, sessionNum)}
                          className={`absolute w-full border-b border-slate-800/30 flex items-center justify-center transition-all ${isCurrent ? 'cursor-pointer active:bg-indigo-500/10' : ''} ${isBlocked ? 'bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:10px_10px]' : ''}`} 
                          style={{ top: `${i * rowHeight}px`, height: `${rowHeight}px` }}
                        >
                          {isBlocked && (
                            <div className="flex flex-col items-center opacity-40">
                              <i className="fas fa-lock text-slate-700 text-xs mb-1"></i>
                              <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Locked Slot</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {units.map(unit => {
                      const unitKey = `${unit.projectId}-${unit.subName}-${unit.start}`;
                      const isCompleted = completedUnitKeys.includes(unitKey);
                      const top = (unit.start - 1) * rowHeight;
                      const height = (unit.end - unit.start + 1) * rowHeight;

                      return (
                        <div 
                          key={unitKey}
                          onClick={() => handleSlotClick(d, unit.start)}
                          className={`absolute inset-x-0 mx-3 rounded-2xl flex flex-col p-4 transition-all border-2 group overflow-hidden ${
                            isCurrent ? 'cursor-pointer shadow-xl' : 'opacity-40 saturate-50 pointer-events-none'
                          } ${isCompleted ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-700/50 backdrop-blur-sm'}`}
                          style={{ 
                            top: `${top + 6}px`, 
                            height: `${height - 12}px`,
                            backgroundColor: isCompleted ? undefined : unit.color,
                            boxShadow: isCompleted ? '0 10px 20px -5px rgba(16, 185, 129, 0.4)' : `0 10px 20px -5px ${unit.color}40`
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-black uppercase tracking-tight truncate drop-shadow-md">{unit.projectName}</span>
                            {isCompleted && <i className="fas fa-check-circle text-sm"></i>}
                          </div>
                          <div className="mt-auto flex items-center gap-2">
                            <div className="bg-black/20 px-2 py-0.5 rounded-lg border border-white/10">
                              <span className="text-[9px] font-mono font-black text-white">{unit.subName}</span>
                            </div>
                            <span className="text-[8px] font-black text-white/60 uppercase">{unit.end - unit.start + 1} SESS</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ACTION OVERLAY (BOTTOM SHEET SIMULATED) */}
      {selectedSlot && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full bg-slate-900 border-t border-slate-700 rounded-t-[2.5rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-lg font-black uppercase italic tracking-tighter">
                  {selectedSlot.unit ? `Control: ${selectedSlot.unit.projectName}` : `Slot ${selectedSlot.session} Control`}
                </h4>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Manual Floor Override System</p>
              </div>
              <button onClick={() => setSelectedSlot(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-500"><i className="fas fa-times"></i></button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {selectedSlot.unit ? (
                <>
                  <button 
                    onClick={() => {
                      onToggleUnit(`${selectedSlot.unit.projectId}-${selectedSlot.unit.subName}-${selectedSlot.unit.start}`);
                      setSelectedSlot(null);
                    }}
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all active:scale-95 ${completedUnitKeys.includes(`${selectedSlot.unit.projectId}-${selectedSlot.unit.subName}-${selectedSlot.unit.start}`) ? 'bg-slate-950 border-slate-800' : 'bg-emerald-600 border-emerald-400'}`}
                  >
                    <div className="flex items-center gap-4">
                      <i className={`fas ${completedUnitKeys.includes(`${selectedSlot.unit.projectId}-${selectedSlot.unit.subName}-${selectedSlot.unit.start}`) ? 'fa-rotate-left' : 'fa-check'} text-lg`}></i>
                      <span className="text-xs font-black uppercase tracking-widest">{completedUnitKeys.includes(`${selectedSlot.unit.projectId}-${selectedSlot.unit.subName}-${selectedSlot.unit.start}`) ? 'Unmark Completion' : 'Mark as Complete'}</span>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => {
                      // Block all sessions of this unit to cancel it today
                      for (let s = selectedSlot.unit.start; s <= selectedSlot.unit.end; s++) {
                        onManualOverride(s, true);
                      }
                      setSelectedSlot(null);
                    }}
                    className="flex items-center justify-between p-5 rounded-2xl bg-red-600 border-2 border-red-400 active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <i className="fas fa-ban text-lg"></i>
                      <span className="text-xs font-black uppercase tracking-widest">Cancel / Clear Slot</span>
                    </div>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => {
                    const isBlocked = blockedSessions.includes(selectedSlot.session);
                    onManualOverride(selectedSlot.session, !isBlocked);
                    setSelectedSlot(null);
                  }}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 active:scale-95 ${blockedSessions.includes(selectedSlot.session) ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-slate-700'}`}
                >
                  <div className="flex items-center gap-4">
                    <i className={`fas ${blockedSessions.includes(selectedSlot.session) ? 'fa-unlock' : 'fa-lock'} text-lg`}></i>
                    <span className="text-xs font-black uppercase tracking-widest">{blockedSessions.includes(selectedSlot.session) ? 'Release Slot' : 'Block Slot (Maintenance)'}</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;