import { useState } from "react";

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

const Tracker = () => {
  const [adjustedSchedule, setAdjustedSchedule] = useState<AdjustedSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const adjustSchedule = async ({ tasks }: { tasks: Task[] }) => {
    return new Promise<AdjustedSchedule>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.2) {
          resolve({
            schedule: tasks.map((task) => ({
              task: task.name,
              timeAllocation: Math.floor(Math.random() * 5) + 1,
            })),
          });
        } else {
          reject(new Error("Failed to generate plan."));
        }
      }, 1500);
    });
  };

  const handleDTR = async () => {
    setLoading(true);
    setError(null);
    try {
      const tasks: Task[] = [
        { name: "Math Homework", deadline: "2025-01-31" },
        { name: "History Essay", deadline: "2025-02-02" },
      ];

      const newSchedule = await adjustSchedule({ tasks });
      setAdjustedSchedule(newSchedule);
    } catch (err: any) {
      setError(err.message || "Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-indigo-100 to-indigo-300 min-h-screen flex flex-col items-center">
      <h2 className="text-4xl font-bold text-indigo-900 mb-6 text-center shadow-lg">
        Progress Tracker
      </h2>

      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-6">
        <p className="text-center text-gray-700 mb-4">
          Use Dynamic Time Redistribution (DTR) to optimize your schedule!
        </p>
        <button
          onClick={handleDTR}
          className={`w-full py-3 bg-indigo-700 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all duration-300 ${
            loading && "opacity-50 cursor-not-allowed"
          }`}
          disabled={loading}
        >
          {loading ? "Adjusting Schedule..." : "Adjust Schedule (DTR)"}
        </button>

        {error && (
          <div className="mt-4 text-center text-red-600 font-medium bg-red-100 p-3 rounded-lg">
            {error}
          </div>
        )}

        {adjustedSchedule && (
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-300 shadow-md">
            <h3 className="text-2xl font-bold text-indigo-900 mb-4 text-center">
              Adjusted Schedule
            </h3>
            <ul className="space-y-2">
              {adjustedSchedule.schedule.map((item, index) => (
                <li
                  key={index}
                  className="bg-white rounded-md shadow p-3 flex justify-between items-center text-gray-800"
                >
                  <span>{item.task}</span>
                  <span className="text-indigo-700 font-semibold">
                    {item.timeAllocation} hours
                  </span>
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
