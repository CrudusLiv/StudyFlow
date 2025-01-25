import { useState } from 'react';

// Define Task and AdjustedSchedule types
type Task = {
  name: string;
  deadline: string;
};

type AdjustedSchedule = {
  schedule: {
    task: string;
    timeAllocation: number;
  }[];
};

// Mock the `adjustSchedule` function
const adjustSchedule = async ({ tasks }: { tasks: Task[] }) => {
  // Simulate a delay and mock data
  return new Promise<AdjustedSchedule>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.2) {
        resolve({
          schedule: tasks.map((task) => ({
            task: task.name,
            timeAllocation: Math.floor(Math.random() * 5) + 1, // Random hours
          })),
        });
      } else {
        reject(new Error('Failed to generate plan.'));
      }
    }, 1500); // Simulated delay
  });
};

const Tracker = () => {
  const [progress, setProgress] = useState(50);
  const [adjustedSchedule, setAdjustedSchedule] = useState<AdjustedSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handler for Dynamic Time Redistribution (DTR)
  const handleDTR = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const tasks: Task[] = [
        { name: 'Math Homework', deadline: '2025-01-31' },
        { name: 'History Essay', deadline: '2025-02-02' },
      ];

      const newSchedule = await adjustSchedule({ tasks });
      setAdjustedSchedule(newSchedule);
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-4xl font-bold text-indigo-700 mb-8 text-center">
        Progress Tracker
      </h2>
      <div className="max-w-lg mx-auto">
        {/* Button to trigger DTR */}
        <button
          onClick={handleDTR}
          className={`px-6 py-3 bg-indigo-700 text-white font-semibold rounded-md hover:bg-indigo-600 ${
            loading && 'opacity-50 cursor-not-allowed'
          }`}
          disabled={loading}
        >
          {loading ? 'Adjusting Schedule...' : 'Adjust Schedule (DTR)'}
        </button>

        {/* Display Error Message */}
        {error && (
          <div className="mt-4 text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Display Adjusted Schedule */}
        {adjustedSchedule && (
          <div className="mt-8 p-6 bg-white shadow rounded-md border">
            <h3 className="text-2xl font-bold text-indigo-700 mb-4">
              Adjusted Schedule
            </h3>
            <ul className="space-y-4">
              {adjustedSchedule.schedule.map((item, index) => (
                <li key={index} className="text-lg text-gray-700">
                  {item.task}: {item.timeAllocation} hours
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracker;
