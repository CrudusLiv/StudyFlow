import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Assignment {
  _id: string;
  title: string;
  description?: string;
  startDate: string; // Add this property
  dueDate: string;
  progress: number;
  completed: boolean;
}

interface ProgressStats {
  totalAssignments: number;
  completedAssignments: number;
  overallProgress: number;
  timeRemaining: number;
}

const Tracker: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalAssignments: 0,
    completedAssignments: 0,
    overallProgress: 0,
    timeRemaining: 0
  });

  const calculateProgress = useCallback((assignment: Assignment) => {
    const now = new Date().getTime();
    const dueDate = new Date(assignment.dueDate).getTime();
    const startDate = assignment.startDate ? new Date(assignment.startDate).getTime() : now - (24 * 60 * 60 * 1000); // Default to 24h ago
    const totalDuration = dueDate - startDate;
    const elapsed = now - startDate;
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  }, []);

  const updateProgressStats = useCallback(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.completed).length;
    const progress = assignments.reduce((acc, curr) => acc + calculateProgress(curr), 0) / total;
    
    const now = new Date().getTime();
    const remainingAssignments = assignments.filter(a => !a.completed);
    const avgTimeRemaining = remainingAssignments.reduce((acc, curr) => {
      const dueDate = new Date(curr.dueDate).getTime();
      return acc + (dueDate - now);
    }, 0) / (remainingAssignments.length || 1);

    setStats({
      totalAssignments: total,
      completedAssignments: completed,
      overallProgress: progress,
      timeRemaining: avgTimeRemaining / (1000 * 60 * 60 * 24) // Convert to days
    });
  }, [assignments, calculateProgress]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await axios.get('http://localhost:5000/assignments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAssignments(response.data);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      }
    };

    fetchAssignments();
  }, []);

  useEffect(() => {
    updateProgressStats();
    const interval = setInterval(updateProgressStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [assignments, updateProgressStats]);

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Progress Tracker</h2>
        
        {/* Progress Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Assignment Progress</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={assignments}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="title"
                  stroke="#D1D5DB"
                  tick={{ fill: '#D1D5DB' }}
                />
                <YAxis 
                  stroke="#D1D5DB"
                  tick={{ fill: '#D1D5DB' }}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: '#F3F4F6'
                  }}
                />
                <Legend wrapperStyle={{ color: '#F3F4F6' }} />
                <Line 
                  type="monotone"
                  dataKey="progress"
                  stroke="#818CF8"
                  strokeWidth={2}
                  dot={{ fill: '#818CF8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Overall Progress Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Overall Progress</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 dark:text-indigo-400 bg-indigo-200 dark:bg-indigo-900">
                    Progress
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                    {stats.overallProgress.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200 dark:bg-indigo-900">
                <div 
                  style={{ width: `${stats.overallProgress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                ></div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Assignments</h3>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.completedAssignments}/{stats.totalAssignments}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Time Remaining</h3>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.timeRemaining.toFixed(1)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Days Average</p>
          </div>

          {/* Assignment List */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 md:col-span-2 lg:col-span-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Active Assignments</h3>
            <div className="space-y-4">
              {assignments.map(assignment => (
                <div key={assignment._id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{assignment.title}</h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200 dark:bg-indigo-900">
                      <div 
                        style={{ width: `${calculateProgress(assignment)}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracker;
