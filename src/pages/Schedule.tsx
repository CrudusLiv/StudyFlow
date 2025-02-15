import { useState } from 'react';
import { generateStudyPlan } from '../services/aiService';
import TimeDistribution from '../pages/TimeDistribution';

// Define interfaces for AI response
interface Task {
  task: string;
  timeAllocation: number;
}

interface AIPlan {
  plan: Task[];
}

const Schedule = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [studyHours, setStudyHours] = useState<number>(2);
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const addTask = () => {
    if (taskName && deadline) {
      setTasks((prev) => [...prev, { task: taskName, timeAllocation: 0 }]);
      setTaskName('');
      setDeadline('');
    }
  };

  const fetchAiPlan = async () => {
    setLoading(true);
    try {
      const result = await generatePlan();
      setAiPlan(result);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      const data = {
        // Add required data properties here based on your aiService requirements
        subject: "Math",
        duration: 60,
        // ... other required fields
      };
      const result = await generateStudyPlan(data);
      setTasks(result.plan);
    } catch (error) {
      // Handle error
    }
  };
  const handlePlanError = (error: Error): AIPlan => {
    handleError(error);
    return {
      plan: []
    };
  };

  const handleError = (error: Error) => {
    console.error(error);
    // Add error handling logic here
  };
    return (
      <div>
        <h2 className="text-4xl font-bold text-indigo-700 mb-8">
          Personalized Schedule
        </h2>
        <div className="space-y-6 grid auto-cols-auto auto-rows-auto gap-6">
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Task Name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full md:w-auto flex-grow px-4 py-2 border rounded-md"
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full md:w-auto flex-grow px-4 py-2 border rounded-md"
            />
            <button
              onClick={addTask}
              className="px-6 py-2 bg-indigo-700 text-white font-semibold rounded-md hover:bg-indigo-600"
            >
              Add Task
            </button>
          </div>

          <div>
            <label className="block mb-2 text-gray-600">Study Hours per Day:</label>
            <input
              type="number"
              value={studyHours}
              onChange={(e) => setStudyHours(Math.max(0, Math.min(24, Number(e.target.value))))} 
              className="px-4 py-2 border rounded-md"
            />
          </div>

          <button
            onClick={fetchAiPlan}
            className="mt-6 px-8 py-4 bg-indigo-700 text-indigo-700 font-semibold rounded-md hover:bg-indigo-600"
          >
            {loading ? 'Generating Plan...' : 'Generate AI Plan'}
          </button>

          {tasks.map((task, index) => (
            <div key={index}>
              {task.task}
            </div>
          ))}

          {aiPlan && (
            <div className="mt-8 p-6 bg-white shadow rounded-md border">
              <h3 className="text-2xl font-bold text-indigo-700 mb-4">
                AI-Generated Study Plan
              </h3>
              <ul className="space-y-4">
                {aiPlan.plan.map((item: Task, index: number) => (
                  <li
                    key={index}
                    className="flex justify-between items-center px-6 py-4 bg-gray-100 shadow rounded-md"
                  >
                    <span className="text-lg font-medium">{item.task}</span>
                    <span className="text-gray-600">{item.timeAllocation} hours</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <TimeDistribution studyHours={studyHours} />
        </div>
      </div>
    );
  };

export default Schedule;
