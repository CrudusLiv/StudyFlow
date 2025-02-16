import { useState } from "react";
import { BsCalendar2Week, BsCalendarDay, BsPlusCircle } from 'react-icons/bs';
import { MdDeleteOutline } from 'react-icons/md';
import { FaTasks } from 'react-icons/fa';
import { RiPencilLine } from 'react-icons/ri';

const Planner = () => {
  const [dailyTasks, setDailyTasks] = useState<string>("");
  const [weeklyTasks, setWeeklyTasks] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [tasks, setTasks] = useState<{ daily: Task[]; weekly: Task[] }>({ daily: [], weekly: [] });

  interface Task {
    text: string;
    id: number;
    
  }
  

  const handleAddTask = (type: 'daily' | 'weekly', taskText: string) => {
    if (!taskText.trim()) return;
    setTasks((prevTasks) => ({
      ...prevTasks,
      [type]: [...prevTasks[type], { text: taskText, id: Date.now() }],
    }));
    if (type === 'daily') setDailyTasks("");
    if (type === 'weekly') setWeeklyTasks("");
  };

  const handleDeleteTask = (type: 'daily' | 'weekly', id: number) => {
    setTasks((prevTasks) => ({
      ...prevTasks,
      [type]: prevTasks[type].filter((task) => task.id !== id),
    }));
  };

return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white flex items-center gap-3">
          <FaTasks className="text-indigo-600" />
          Planner
        </h1>
        
        <div className="space-y-6">
          <div className="flex space-x-4 border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 font-medium focus:outline-none flex items-center gap-2 ${
                activeTab === 'daily' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-blue-600'
              }`}
            >
              <BsCalendarDay />
              Daily
            </button>
            <button 
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 font-medium focus:outline-none flex items-center gap-2 ${
                activeTab === 'weekly' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-blue-600'
              }`}
            >
              <BsCalendar2Week />
              Weekly
            </button>
          </div>

          {activeTab === 'daily' && (
            <div>
              <div className="mb-6 hover:shadow-lg transition-shadow duration-300 rounded-lg border bg-white p-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <BsCalendarDay className="text-indigo-600" />
                  Daily Planner
                </h2>
                <div className="relative">
                  <RiPencilLine className="absolute top-4 left-4 text-gray-400" />
                  <textarea
                    placeholder="Add your daily tasks here..."
                    value={dailyTasks}
                    onChange={(e) => setDailyTasks(e.target.value)}
                    className="w-full h-48 p-4 pl-12 rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button 
                  onClick={() => handleAddTask('daily', dailyTasks)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-black px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <BsPlusCircle />
                  Add Task
                </button>
                <ul className="mt-6 space-y-2">
                  {tasks.daily.map((task) => (
                    <li key={task.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <FaTasks className="text-indigo-600" />
                        {task.text}
                      </span>
                      <button 
                        onClick={() => handleDeleteTask('daily', task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <MdDeleteOutline className="text-xl" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'weekly' && (
            <div>
              <div className="mb-6 hover:shadow-lg transition-shadow duration-300 rounded-lg border bg-white p-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <BsCalendar2Week className="text-indigo-600" />
                  Weekly Planner
                </h2>
                <div className="relative">
                  <RiPencilLine className="absolute top-4 left-4 text-gray-400" />
                  <textarea
                    placeholder="Add your weekly tasks here..."
                    value={weeklyTasks}
                    onChange={(e) => setWeeklyTasks(e.target.value)}
                    className="w-full h-48 p-4 pl-12 rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button 
                  onClick={() => handleAddTask('weekly', weeklyTasks)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-black px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <BsPlusCircle />
                  Add Task
                </button>
                <ul className="mt-6 space-y-2">
                  {tasks.weekly.map((task) => (
                    <li key={task.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <FaTasks className="text-indigo-600" />
                        {task.text}
                      </span>
                      <button 
                        onClick={() => handleDeleteTask('weekly', task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <MdDeleteOutline className="text-xl" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Planner;