import React, { useState } from 'react';
import { generateSchedule } from '../services/ai';
import type { Task, Schedule } from '../types/types';

const AiIntegration: React.FC = () => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Placeholder for AI-based PDF processing
      console.log('File uploaded:', file);
      // For now, we'll use a mock list of tasks
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', duration: 60, priority: 'high', category: 'study', completed: false },
        { id: '2', title: 'Task 2', duration: 30, priority: 'medium', category: 'exercise', completed: false },
        { id: '3', title: 'Task 3', duration: 45, priority: 'low', category: 'break', completed: false },
      ];
      const generatedSchedule = await generateSchedule(tasks);
      setSchedule(generatedSchedule);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6">AI Integration</h2>
        <input type="file" accept=".pdf" onChange={handleFileUpload} />
        {schedule && (
          <div className="mt-6">
            <h3 className="text-xl font-bold">Generated Schedule</h3>
            <div className="text-sm text-gray-600 mb-4">
              {new Date(schedule.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <ul>
              {schedule.tasks.map((task) => (
                <li key={task.id} className="mb-2">
                  <div className="font-semibold">{task.title}</div>
                  <div className="text-sm text-gray-600">{task.duration} minutes - {task.priority} priority</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiIntegration;