export interface Task {
  id: string;
  title: string;
  duration: number;
  priority: 'high' | 'medium' | 'low';
  category: 'study' | 'break' | 'exercise' | 'other';
  completed: boolean;
}

export interface Schedule {
  date: string;
  tasks: Task[];
}
