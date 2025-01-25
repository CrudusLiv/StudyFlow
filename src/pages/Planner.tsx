import { useState } from 'react';

const Planner = () => {
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');

  const addGoal = () => {
    if (newGoal.trim() !== '') {
      setGoals((prev) => [...prev, newGoal]);
      setNewGoal('');
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 p-6">
      <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">Planner</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-indigo-700 mb-4">Add Your Goal</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="E.g., Finish math homework"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-300"
            />
            <button
              onClick={addGoal}
              className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 transition"
            >
              Add Goal
            </button>
          </div>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-indigo-700 mb-4">Your Goals</h3>
          <ul className="space-y-4">
            {goals.map((goal, index) => (
              <li
                key={index}
                className="p-3 bg-gray-100 rounded-md shadow-sm border border-gray-200"
              >
                {goal}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Planner;
