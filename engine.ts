
import { Project, ProjectStatus, ScheduleEntry, SubProductTime } from './types';
import { SESSIONS_PER_DAY, COOLDOWN, DEADLINE_BUFFER } from './constants';

class SchedulerProject {
  id: string;
  name: string;
  deadline: number;
  durations: SubProductTime;
  remainingUnits: { [s: string]: number };
  moldReady: { [s: string]: number };
  color: string;

  constructor(p: Project, statuses: ProjectStatus[]) {
    this.id = p.id;
    this.name = p.name;
    this.deadline = p.deadline - DEADLINE_BUFFER;
    this.durations = p.subTimes;
    this.color = p.color;
    
    this.remainingUnits = {};
    this.moldReady = {};
    
    statuses.filter(s => s.projectId === p.id).forEach(s => {
      this.remainingUnits[s.subproductName] = s.unitsRemaining;
      this.moldReady[s.subproductName] = s.moldReadySession;
    });
  }

  get totalSessionsRemaining(): number {
    return Object.keys(this.remainingUnits).reduce((sum, s) => {
      return sum + (this.remainingUnits[s] * this.durations[s]);
    }, 0);
  }

  get isComplete(): boolean {
    return Object.values(this.remainingUnits).every(v => v === 0);
  }
}

export function runScheduler(
  projects: Project[],
  statuses: ProjectStatus[],
  startDay: number = 1
): { schedule: ScheduleEntry[]; error?: string } {
  const schedProjects = projects.map(p => new SchedulerProject(p, statuses));
  let day = startDay;
  let globalSession = (startDay - 1) * SESSIONS_PER_DAY;
  const schedule: ScheduleEntry[] = [];

  try {
    while (schedProjects.some(p => !p.isComplete)) {
      if (day > 100) throw new Error("Scheduling limit exceeded (100 days). This project mix might be impossible.");

      const occupiedInDay = new Array(SESSIONS_PER_DAY + 1).fill(false);

      for (let session = 1; session <= SESSIONS_PER_DAY; session++) {
        const currentGlobalSession = (day - 1) * SESSIONS_PER_DAY + session;
        
        if (occupiedInDay[session]) continue;

        const candidates: { proj: SchedulerProject; validSubs: string[] }[] = [];
        for (const p of schedProjects) {
          if (p.isComplete) continue;
          
          if (day > p.deadline) {
             throw new Error(`Deadline missed for ${p.name} on Day ${day}`);
          }

          const validSubs = Object.keys(p.remainingUnits).filter(s => {
            const units = p.remainingUnits[s];
            if (units <= 0) return false;
            
            // Constraint A: Cooldown
            if (p.moldReady[s] > currentGlobalSession) return false;
            
            // Constraint B: Atomic Fit
            const duration = p.durations[s];
            if (session + duration - 1 > SESSIONS_PER_DAY) return false;
            
            return true;
          });

          if (validSubs.length > 0) {
            candidates.push({ proj: p, validSubs });
          }
        }

        if (candidates.length === 0) continue;

        // Urgency Sort
        candidates.sort((a, b) => {
          const daysLeftA = Math.max(0.001, a.proj.deadline - (day - 1));
          const daysLeftB = Math.max(0.001, b.proj.deadline - (day - 1));
          const priorityA = a.proj.totalSessionsRemaining / daysLeftA;
          const priorityB = b.proj.totalSessionsRemaining / daysLeftB;
          return priorityB - priorityA;
        });

        const best = candidates[0];
        // Heuristic: Pick longest duration subproduct
        const bestS = best.validSubs.reduce((a, b) => 
          best.proj.durations[a] >= best.proj.durations[b] ? a : b
        );

        const duration = best.proj.durations[bestS];
        best.proj.remainingUnits[bestS] -= 1;
        
        const finishGlobalSession = currentGlobalSession + duration;
        best.proj.moldReady[bestS] = finishGlobalSession + COOLDOWN;

        for (let i = 0; i < duration; i++) {
          const sIdx = session + i;
          occupiedInDay[sIdx] = true;
          schedule.push({
            day,
            session: sIdx,
            projectId: best.proj.id,
            projectName: best.proj.name,
            subproductName: bestS,
            isCompleted: false,
            color: best.proj.color
          });
        }
      }
      day++;
    }
    return { schedule };
  } catch (e: any) {
    return { schedule, error: e.message };
  }
}
