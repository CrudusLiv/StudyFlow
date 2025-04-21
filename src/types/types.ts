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
  courseCode?: string;
  description?: string;
  allDay?: boolean;
  resource?: {
    type?: string;
    location?: string;
    recurring?: boolean;
    day?: string;
    courseCode?: string;
    details?: {
      courseName?: string;
      [key: string]: any;
    };
  };
  status?: 'pending' | 'in-progress' | 'completed';
  category?: string;
  location?: string;
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

export interface SemesterDates {
  startDate: Date;
  endDate: Date;
}

export interface ClassData {
  courseName: string;
  courseCode: string;
  startTime: string;
  endTime: string;
  location: string;
  professor: string;
  day: string;
  semesterDates?: SemesterDates;
}

export interface Assignment {
  _id: string;
  title: string;
  description: string;
  courseCode?: string;
  startDate: string;
  dueDate: string;
  progress: number;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}
