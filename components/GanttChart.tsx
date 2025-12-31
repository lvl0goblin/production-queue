
import React from 'react';
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
  if (schedule.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-400 shadow-sm">
        <div className="bg-slate-50 p-8 rounded-full mb-4 border border-slate-100">
          <i className="fas fa-calendar-times text-5xl opacity-10"></i>
        </div>
        <p className="font-black text-xl tracking-tight uppercase">No Work Scheduled</p>
        <p className="text-sm mt-1 font-medium">Add projects to generate a timeline.</p>
      </div>
    );
  }

  const scheduleDays = schedule.map(s => s.day);
  const maxDayInSchedule = scheduleDays.length > 0 ? Math.max(...scheduleDays) : currentDay + 7;
  const maxDay = Math.max(maxDayInSchedule, currentDay + 7);
  const daysToShow = Array.from({ length: maxDay - currentDay + 1 }, (_, i) => currentDay + i);
  const sessionRows = Array.from({ length: SESSIONS_PER_DAY }, (_, i) => i + 1);

  const grid: { [key: string]: ScheduleEntry } = {};
  schedule.forEach(item => {
    grid[`${item.day}-${item.session}`] = item;
  });

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

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative">
      <div className="overflow-x-auto custom-scrollbar bg-white">
        <div className="inline-block min-w-full align-middle">
          <div className="flex">
            {/* Session Column - Sticky Left with lower z-index than app header */}
            <div className="flex-none w-24 bg-white sticky left-0 z-[45] border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.03)]">
              <div className="h-16 flex items-center justify-center border-b border-slate-200 bg-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sess.</span>
              </div>
              {sessionRows.map(s => (
                <div key={s} className="h-28 flex items-center justify-center border-b border-slate-100 bg-white">
                  <span className="font-mono font-black text-4xl text-slate-200 leading-none">
                    {s < 10 ? `0${s}` : s}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {daysToShow.map(d => {
              const date = getDateForDay(d);
              const isCurrent = d === currentDay;
              const units = getDayAtomicUnits(d);

              return (
                <div key={d} className={`flex-none w-80 border-r border-slate-100 relative ${isCurrent ? 'bg-blue-50/20' : ''}`}>
                  {/* Day Header - Sticky Top */}
                  <div className={`h-16 flex flex-col items-center justify-center sticky top-0 z-[40] transition-all ${isCurrent ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-500'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${isCurrent ? 'text-blue-400' : 'text-slate-400'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-lg font-black tracking-tight">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {isCurrent && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>}
                  </div>

                  {/* Day Grid Container (Row height 112px) */}
                  <div className="relative" style={{ height: `${SESSIONS_PER_DAY * 112}px` }}>
                    {sessionRows.map(s => (
                      <div key={s} className="absolute w-full h-px bg-slate-100" style={{ top: `${(s) * 112}px` }}></div>
                    ))}

                    {units.map(unit => {
                      const unitKey = `${unit.projectId}-${unit.subName}-${unit.start}`;
                      const isCompleted = completedUnitKeys.includes(unitKey);
                      const top = (unit.start - 1) * 112;
                      const height = (unit.end - unit.start + 1) * 112;

                      return (
                        <div 
                          key={unitKey}
                          onClick={() => isCurrent && onToggleUnit(unitKey)}
                          className={`absolute inset-x-0 mx-2 rounded-[2.5rem] flex flex-col items-center justify-center p-4 transition-all overflow-hidden border-4 shadow-sm ${
                            isCurrent 
                              ? 'cursor-pointer active:scale-95 hover:shadow-2xl hover:brightness-105' 
                              : 'opacity-70 grayscale-[0.2]'
                          }`}
                          style={{ 
                            top: `${top + 8}px`, 
                            height: `${height - 16}px`,
                            backgroundColor: isCurrent && isCompleted ? '#10b981' : unit.color,
                            borderColor: isCurrent && isCompleted ? '#34d399' : 'rgba(255,255,255,0.2)'
                          }}
                        >
                          <div className="flex flex-col items-center justify-center text-center w-full px-2 pointer-events-none relative" style={{ height: '100%' }}>
                            {/* Project Name (Just above center line) */}
                            <div className="absolute bottom-1/2 translate-y-[-4px] w-full text-center">
                                <span className="text-white font-black text-4xl leading-none drop-shadow-lg uppercase tracking-tighter">
                                {unit.projectName}
                                </span>
                            </div>
                            
                            {/* Center Line visual divider (Hidden) */}
                            <div className="w-full h-px bg-transparent"></div>

                            {/* Subproduct Name (Just below center line) */}
                            <div className="absolute top-1/2 translate-y-[12px] w-full text-center">
                                <span className="text-white font-black text-2xl leading-none drop-shadow-md uppercase tracking-[0.15em] opacity-90">
                                {unit.subName}
                                </span>
                            </div>
                          </div>

                          {/* Completion Tick Icon - Moved to corner to avoid blocking text */}
                          {isCurrent && (
                            <div className={`absolute bottom-5 right-5 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isCompleted ? 'bg-white shadow-2xl scale-110' : 'bg-black/15 border-2 border-white/40'}`}>
                              {isCompleted ? (
                                <i className="fas fa-check text-emerald-600 text-xl"></i>
                              ) : (
                                <i className="fas fa-play text-white/40 text-base"></i>
                              )}
                            </div>
                          )}
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
      
      <div className="bg-slate-50 px-10 py-8 border-t border-slate-200 flex flex-col md:flex-row items-center gap-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
         <div className="flex items-center gap-4">
           <div className="w-6 h-6 rounded-xl bg-slate-900 shadow-md"></div>
           <span className="text-slate-800">Operational Shift</span>
         </div>
         <div className="flex items-center gap-4">
           <div className="w-6 h-6 rounded-xl bg-emerald-500 shadow-md"></div>
           <span className="text-emerald-600 tracking-widest">Marked As Finished</span>
         </div>
         <div className="md:ml-auto flex items-center gap-4 text-slate-500 italic normal-case tracking-normal font-bold">
            <span className="text-base text-blue-500">Click production units to record completions</span>
         </div>
      </div>
    </div>
  );
};

export default GanttChart;
