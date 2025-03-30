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



// Reminder interface defines the structure of a reminder object
export interface Reminder {
  _id: string;          // Unique identifier for the reminder
  title: string;        // Title of the reminder
  message: string;      // Detailed message of the reminder
  dueDate: string;      // Due date of the associated assignment
  reminderDate: string; // Date when the reminder should be shown
  isRead: boolean;      // Whether the reminder has been read
  assignmentId?: {
    title: string;
  };
}