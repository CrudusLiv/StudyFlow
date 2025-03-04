import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
    const interval = setInterval(updateProgressStats, 60000);
    return () => clearInterval(interval);
  }, [assignments, updateProgressStats]);

  return (
    <div className="tracker-container">
      <div className="tracker-wrapper">
        <h2 className="tracker-title">Progress Tracker</h2>
        
        <div className="chart-container">
          <h3 className="chart-title">Assignment Progress</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer>
              <LineChart data={assignments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="progress" stroke="#818cf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3 className="stat-title">Overall Progress</h3>
            <div className="progress-container">
              <div className="progress-header">
                <span className="progress-label">Progress</span>
                <span className="progress-value">{stats.overallProgress.toFixed(1)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${stats.overallProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="stat-title">Assignments</h3>
            <div className="stat-value">
              {stats.completedAssignments}/{stats.totalAssignments}
            </div>
            <p className="stat-label">Completed</p>
          </div>

          <div className="stat-card">
            <h3 className="stat-title">Time Remaining</h3>
            <div className="stat-value">{stats.timeRemaining.toFixed(1)}</div>
            <p className="stat-label">Days Average</p>
          </div>
        </div>

        <div className="assignments-list">
          <h3 className="chart-title">Active Assignments</h3>
          <div className="assignments-grid">
            {assignments.map(assignment => (
              <div key={assignment._id} className="assignment-item">
                <div className="assignment-header">
                  <h4 className="assignment-title">{assignment.title}</h4>
                  <span className="assignment-date">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${calculateProgress(assignment)}%` }}
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