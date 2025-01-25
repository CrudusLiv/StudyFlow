import { useState } from 'react';
import ScheduleForm from '../components/Schedule/ScheduleForm';
import ScheduleList from '../components/Schedule/ScheduleList';

const Schedule = () => {
  const [schedules, setSchedules] = useState<{ time: string; activity: string }[]>([]);

  const addSchedule = (schedule: { time: string; activity: string }) => {
    setSchedules((prev) => [...prev, schedule]);
  };

  return (
    <div className="min-h-screen bg-indigo-50 p-6">
      <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">Daily Schedule</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <ScheduleForm addSchedule={addSchedule} />
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-indigo-700 mb-4">Your Schedule</h3>
          <ScheduleList schedules={schedules} />
        </div>
      </div>
    </div>
  );
};

export default Schedule;
