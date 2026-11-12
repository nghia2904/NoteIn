export type Repeat = { type: 'daily' } | { type: 'weekdays'; days: number[] };

export interface DailyTemplate {
  id: string;
  title: string;
  note?: string;
  startMin: number;
  durationMin: number;
  repeat: Repeat;
  isActive: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  note?: string;
  date: string;
  startMin: number;
  durationMin?: number;
}

export interface TimelineItem {
  key: string;
  source: 'daily' | 'event';
  refId: string;
  date: string;
  title: string;
  note?: string;
  startMin: number;
  endMin: number;
  done: boolean;
  conflictWith: string[];
}

export type CurrentState =
  | { kind: 'current'; item: TimelineItem; progressPct: number; minutesLeft: number }
  | { kind: 'upcoming'; item: TimelineItem; minutesUntil: number }
  | { kind: 'finished' }
  | { kind: 'empty' };
