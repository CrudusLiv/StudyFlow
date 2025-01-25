import { useState } from 'react';

interface ScheduleFormProps {
  addSchedule: (schedule: { time: string; activity: string }) => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ addSchedule }) => {
  const [time, setTime] = useState('');
  const [activity, setActivity] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (time && activity) {
      addSchedule({ time, activity });
      setTime('');
      setActivity('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-lg rounded-lg p-6 space-y-4 border border-gray-200"
    >
      <h3 className="text-lg font-semibold text-indigo-700">Add Your Schedule</h3>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600" htmlFor="time">
          Time
        </label>
        <input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-300"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600" htmlFor="activity">
          Activity
        </label>
        <input
          id="activity"
          type="text"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="E.g., Math class, Gym"
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-300"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 transition"
      >
        Add Schedule
      </button>
    </form>
  );
};

export default ScheduleForm;
