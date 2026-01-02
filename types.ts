export interface SubProductTime {
  [name: string]: number;
}

export interface Project {
  id: string;
  name: string;
  totalDemand: number;
  deadline: number; // Day number relative to start
  subTimes: SubProductTime;
  color: string;
}

export interface ProjectStatus {
  projectId: string;
  subproductName: string;
  unitsRemaining: number;
  moldReadySession: number;
}

export interface ScheduleEntry {
  day: number;
  session: number;
  projectId: string;
  projectName: string;
  subproductName: string;
  isCompleted: boolean;
  color: string;
}

export interface SchedulerState {
  projects: Project[];
  statuses: ProjectStatus[];
  schedule: ScheduleEntry[];
  currentDay: number;
  startDate: string; // ISO String
  completedUnitKeys: string[]; // Identifiers for units completed today
  blockedSessions: number[]; // Sessions of the currentDay that are manually blocked
}