import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ScheduleEntry } from '../types';
import { SESSIONS_PER_DAY } from '../constants';

interface GanttChartProps {
  schedule: ScheduleEntry[];
  currentDay: number;
  startDate: string;
  completedUnitKeys: string[];
  onToggleUnit: (unitKey: string) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ schedule, currentDay, startDate, completedUnitKeys, onToggleUnit }) => {
  const [zoom, setZoom] = useState(1.1); // Slightly larger default zoom
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const daysToShow = useMemo(() => {
    if (schedule.length === 0) return [currentDay, currentDay + 1, currentDay + 2];
    const maxDay = Math.max(...schedule.map(s => s.day), currentDay + 7);
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

  const scrollToToday = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
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

  const rowHeight = 90 * zoom; // Increased height to fit larger text
  const colWidth = 320 * zoom; // Increased width for readability

  if (schedule.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800">
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6">
          <i className="fas fa-calendar-minus text-3xl text-slate-700"></i>
        </div>
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-sm">Shift Schedule Empty</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/30 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl relative">
      
      {/* Zoom Controls & Legend */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center gap-4 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setZoom(Math.max(0.7, zoom - 0.1))} 
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-90"
            aria-label="Zoom out"
          >
            <i className="fas fa-minus"></i>
          </button>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zoom</span>
            <span className="text-xs font-mono font-bold text-indigo-400">{Math.round(zoom * 100)}%</span>
          </div>
          <button 
            onClick={() => setZoom(Math.min(1.8, zoom + 0.1))} 
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-90"
            aria-label="Zoom in"
          >
            <i className="fas fa-plus"></i>
          </button>

          <button 
            onClick={scrollToToday}
            className="ml-4 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <i className="fas fa-location-crosshairs mr-2"></i>
            Current Day
          </button>
        </div>
        
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-indigo-500 shadow-sm shadow-indigo-500/50"></div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Completed</span>
          </div>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto custom-scrollbar relative select-none snap-x-mandatory"
      >
        <div className="inline-block min-w-full align-middle">
          <div className="flex">
            
            {/* Session Sidebar (Sticky Left) */}
            <div className="flex-none w-20 bg-slate-950/90 backdrop-blur-xl sticky left-0 z-40 border-r border-slate-800 shadow-xl">
              <div className="h-20 flex flex-col items-center justify-center border-b border-slate-800 bg-slate-900/50">
                <i className="fas fa-clock text-indigo-500 text-sm mb-1"></i>
                <span className="text-[10px] font-black text-slate-500 uppercase">Unit</span>
              </div>
              {Array.from({ length: SESSIONS_PER_DAY }, (_, i) => i + 1).map(s => (
                <div key={s} className="flex flex-col items-center justify-center border-b border-slate-900/50" style={{ height: `${rowHeight}px` }}>
                   <span className="font-mono text-lg font-black text-slate-400 italic leading-none">{s}</span>
                   <span className="text-[8px] font-black text-slate-600 uppercase mt-1">Slot</span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {daysToShow.map(d => {
              const date = getDateForDay(d);
              const isCurrent = d === currentDay;
              const units = getDayAtomicUnits(d);

              return (
                <div key={d} className={`flex-none relative border-r border-slate-800/50 snap-center ${isCurrent ? 'bg-indigo-500/[0.04]' : ''}`} style={{ width: `${colWidth}px` }}>
                  
                  {/* Day Header */}
                  <div className={`h-20 flex flex-col items-center justify-center sticky top-0 z-30 transition-all border-b shadow-lg ${isCurrent ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900/90 backdrop-blur-md text-slate-500 border-slate-800'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70 leading-none mb-1">
                      {date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                    <span className="text-lg font-black tracking-tighter leading-none uppercase italic">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {isCurrent && (
                       <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                          <span className="text-[8px] font-black text-white/80 uppercase">Active</span>
                       </div>
                    )}
                  </div>

                  {/* Operational Content */}
                  <div className="relative" style={{ height: `${SESSIONS_PER_DAY * rowHeight}px` }}>
                    {Array.from({ length: SESSIONS_PER_DAY }).map((_, i) => (
                      <div key={i} className="absolute w-full h-px bg-slate-800/40" style={{ top: `${(i+1) * rowHeight}px` }}></div>
                    ))}

                    {units.map(unit => {
                      const unitKey = `${unit.projectId}-${unit.subName}-${unit.start}`;
                      const isCompleted = completedUnitKeys.includes(unitKey);
                      const top = (unit.start - 1) * rowHeight;
                      const height = (unit.end - unit.start + 1) * rowHeight;

                      return (
                        <div 
                          key={unitKey}
                          onClick={() => isCurrent && onToggleUnit(unitKey)}
                          className={`absolute inset-x-0 mx-3 rounded-[1.25rem] flex flex-col p-4 transition-all border-2 group overflow-hidden ${
                            isCurrent 
                              ? 'cursor-pointer active:scale-[0.98] hover:brightness-110 shadow-2xl hover:translate-y-[-2px]' 
                              : 'opacity-40 saturate-50 pointer-events-none'
                          } ${isCompleted ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-700/50 backdrop-blur-sm'}`}
                          style={{ 
                            top: `${top + 6}px`, 
                            height: `${height - 12}px`,
                            backgroundColor: isCompleted ? undefined : unit.color,
                            boxShadow: isCompleted ? '0 15px 30px -5px rgba(16, 185, 129, 0.4)' : `0 10px 20px -5px ${unit.color}30`
                          }}
                        >
                          {/* Main Project Name - LARGER FONT */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-sm font-black uppercase tracking-tight truncate leading-tight drop-shadow-md">
                              {unit.projectName}
                            </span>
                            {isCompleted && <i className="fas fa-check-circle text-lg text-emerald-100"></i>}
                          </div>
                          
                          {/* Sub-product Label - LARGER FONT and BETTER CONTRAST */}
                          <div className="flex items-center gap-2 mt-auto">
                            <div className="bg-black/30 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-lg">
                              <span className="text-[11px] font-mono font-black uppercase text-white/90">
                                OP {unit.subName}
                              </span>
                            </div>
                            <div className="text-[10px] font-black text-white/60 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg">
                              {unit.end - unit.start + 1} SESSIONS
                            </div>
                          </div>

                          {/* Detail pop-up simulated hover effect for desktop */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
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
      
      {/* Scroll indicator for mobile */}
      <div className="md:hidden absolute bottom-6 right-6 z-[60] animate-bounce bg-slate-900/90 p-3 rounded-full border border-slate-700 pointer-events-none opacity-50">
        <i className="fas fa-arrow-right text-indigo-400"></i>
      </div>
    </div>
  );
};

export default GanttChart;