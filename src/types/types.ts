export interface Task {
  _id?: string;
  title: string;
  duration?: number;
  priority?: string;
  category?: string;
  completed?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    date?: string;
  };
  end: {
    dateTime: string;
    date?: string;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  allDay?: boolean;
  resource?: ScheduleTask;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in-progress' | 'completed';
  category?: string;
}

export interface Schedule {
  date: string;
  tasks: Task[];
}

export interface ScheduleTask {
  time: string;
  title: string;
  details: string;
  dueDate?: string;
  assignmentTitle?: string;
  courseCode?: string;
  priority?: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  category?: string;
  pdfReference?: {
    page?: string;
    quote?: string;
  };
}

export interface DaySchedule {
  day: string;
  date?: string;
  tasks: ScheduleTask[];
}

export interface WeeklySchedule {
  week: string;
  days: DaySchedule[];
}
