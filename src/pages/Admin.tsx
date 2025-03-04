import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import '../styles/pages/Admin.css';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
}

interface UserActivity {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  totalSessions: number;
  averageSessionDuration: number;
}

interface Analytics {
  totalUsers: number;
  activeToday: number;
  averageSessionDuration: number;
  userActivity: UserActivity[];
}

const Admin: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/admin/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAnalytics(response.data);
      } catch (error) {
        setError('Failed to fetch analytics data');
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!analytics) return <div>No data available</div>;

  const activityData = analytics?.userActivity.map(user => ({
    name: user.name,
    sessions: user.totalSessions,
    average: Math.round(user.averageSessionDuration)
  })) || [];

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="overview-grid">
        <div className="stat-card">
          <h2 className="stat-title">Total Users</h2>
          <p className="stat-description">Active accounts on the platform</p>
          <p className="stat-value">{analytics.totalUsers}</p>
        </div>

        <div className="stat-card">
          <h2 className="stat-title">Active Today</h2>
          <p className="stat-description">Users active in the last 24 hours</p>
          <p className="stat-value">{analytics.activeToday}</p>
        </div>

        <div className="stat-card">
          <h2 className="stat-title">Avg. Session Duration</h2>
          <p className="stat-description">In minutes per user</p>
          <p className="stat-value">{Math.round(analytics.averageSessionDuration)}m</p>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h2 className="chart-title">User Activity</h2>
          <p className="chart-description">Sessions and average duration by user</p>
        </div>
        <div className="chart-content">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sessions" stroke="#8884d8" name="Total Sessions" />
              <Line type="monotone" dataKey="average" stroke="#82ca9d" name="Avg Duration (min)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="chart-title">User Details</h2>
          <p className="chart-description">Detailed view of user activity</p>
        </div>
        <table className="data-table">
          <thead className="table-head">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last Active</th>
              <th>Total Sessions</th>
              <th>Avg. Duration</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {analytics?.userActivity.map((user) => (
              <tr key={user._id || user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{new Date(user.lastLogin).toLocaleDateString()}</td>
                <td>{user.totalSessions}</td>
                <td>{Math.round(user.averageSessionDuration)}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;