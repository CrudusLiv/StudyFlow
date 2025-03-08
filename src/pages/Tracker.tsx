import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaClock, FaChartLine, FaTasks } from 'react-icons/fa';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/pages/Tracker.css';

interface Assignment {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
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
// Add this test data at the top of the file after the interfaces
const testAssignments: Assignment[] = [
  {
    _id: '1',
    title: 'Math Homework',
    description: 'Calculus Chapter 5',
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 65,
    completed: false
  },
  {
    _id: '2',
    title: 'Physics Lab Report',
    description: 'Wave Motion Analysis',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 80,
    completed: false
  },
  {
    _id: '3',
    title: 'History Essay',
    description: 'World War II Impact',
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 30,
    completed: false
  },
  {
    _id: '4',
    title: 'Project Presentation',
    description: 'Final Group Project',
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 100,
    completed: false
  }
];


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
    const startDate = assignment.startDate ? new Date(assignment.startDate).getTime() : now - (24 * 60 * 60 * 1000);
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
      timeRemaining: avgTimeRemaining / (1000 * 60 * 60 * 24)
    });
  }, [assignments, calculateProgress]);

  useEffect(() => {
    // const fetchAssignments = async () => {
    //   try {
    //     const response = await axios.get('http://localhost:5000/assignments', {
    //       headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    //     });
    //     setAssignments(response.data);
    //   } catch (error) {
    //     console.error('Error fetching assignments:', error);
    //   }
    // };

    // fetchAssignments();
    //test data
    setAssignments(testAssignments);
  }, []);

  useEffect(() => {
    updateProgressStats();
    const interval = setInterval(updateProgressStats, 60000);
    return () => clearInterval(interval);
  }, [assignments, updateProgressStats]);

  return (
    <div className="tracker-container">
      <div className="tracker-wrapper">
        <h2 className="tracker-title">Tracker</h2>
        
        <div className="chart-container">
          <div className="chart-wrapper">
            <ResponsiveContainer>
             <LineChart data={assignments}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="title" 
              label={{ value: "Assignment Name", position: "bottom", offset: 5 }}
            />
            <YAxis 
              domain={[0, 100]} 
              unit="%" 
              label={{ value: "Completion Progress", angle: -90, position: "insideLeft" }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="progress" 
              name="Progress" 
              stroke="#818cf8" 
              strokeWidth={2}
              dot={{ stroke: '#6366f1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#4f46e5' }}
            />
          </LineChart>

            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <FaChartLine className="stat-icon" />
            <h3 className="stat-title">Overall Progress</h3>
            <div className="stat-value">{stats.overallProgress.toFixed(1)}%</div>
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${stats.overallProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <FaTasks className="stat-icon" />
            <h3 className="stat-title">Assignments</h3>
            <div className="stat-value">
              {stats.completedAssignments}/{stats.totalAssignments}
            </div>
            <p className="stat-label">Completed Tasks</p>
          </div>

          <div className="stat-card">
            <FaClock className="stat-icon" />
            <h3 className="stat-title">Time Remaining</h3>
            <div className="stat-value">{stats.timeRemaining.toFixed(1)}</div>
            <p className="stat-label">Days Average</p>
          </div>
        </div>
          <div className="assignments-list">
            <h3 className="chart-title">
              <FaTasks className="section-icon" /> Active Assignments
            </h3>
            <div className="assignments-grid">
              {assignments
                .filter(assignment => assignment.progress < 100)
                .map(assignment => (
                  <div key={assignment._id} className="assignment-item">
                    <div className="assignment-header">
                      <h4 className="assignment-title">{assignment.title}</h4>
                      <div className="assignment-meta">
                        <FaClock className="meta-icon" />
                        <span className="assignment-date">
                          Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="assignment-description">{assignment.description}</p>
                    <div className="progress-container">
                      <div className="progress-header">
                        <span className="progress-value">{assignment.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${assignment.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
    </div>
  );
};

export default Tracker;