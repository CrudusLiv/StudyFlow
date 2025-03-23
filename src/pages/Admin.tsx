import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import '../styles/pages/Admin.css';
import { setDefaultResultOrder } from 'dns';

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

  // Sample data for testing
  const sampleAnalytics: Analytics = {
    totalUsers: 156,
    activeToday: 42,
    averageSessionDuration: 45,
    userActivity: [
      {
        _id: '1',
        id: '1',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'student',
        lastLogin: new Date().toISOString(),
        totalSessions: 25,
        averageSessionDuration: 55
      },
      {
        _id: '2',
        id: '2',
        name: 'Emma Wilson',
        email: 'emma@example.com',
        role: 'student',
        lastLogin: new Date().toISOString(),
        totalSessions: 18,
        averageSessionDuration: 40
      }
    ]
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Use sample data for testing
        setAnalytics(sampleAnalytics);
        
        // Uncomment for real API usage
        // const response = await axios.get('http://localhost:5000/api/admin/analytics', {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // setAnalytics(response.data);
        
      } catch (error: any) {
        setError(error.response?.data?.error || 'Failed to fetch analytics data');
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

  const activityData = analytics ? analytics.userActivity.map(user => ({
    name: user.name.split(' ')[0], // Use first name only for better display
    'Study Time': Math.round(user.averageSessionDuration)
  })) : [];

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
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                label={{ value: 'Users', position: 'bottom', offset: 0 }}
              />
              <YAxis 
                label={{ 
                  value: 'Time (minutes)', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10
                }}
              />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="Study Time" 
                fill="#8884d8" 
                name="Average Study Time (min)"
              />
            </BarChart>
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