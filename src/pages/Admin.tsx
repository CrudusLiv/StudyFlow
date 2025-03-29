import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/pages/Admin.css';
import { 
  pageVariants, 
  containerVariants, 
  listVariants, 
  listItemVariants,
  staggeredGrid,
  gridItemVariants
} from '../utils/animationConfig';

interface UserActivity {
  _id: string;
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
        setLoading(true);
        const token = localStorage.getItem('token');

        const response = await axios.get('http://localhost:5000/api/admin/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log("API Response:", response.data); // Debugging

        const formattedData: Analytics = {
          totalUsers: response.data.userCount || 0,
          activeToday: response.data.activeToday || 0,
          averageSessionDuration: response.data.averageSessionDuration || 0,
          userActivity: response.data.userData || [],
        };

        setAnalytics(formattedData);
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

  const activityData = analytics.userActivity.map(user => ({
    name: user.name.split(' ')[0],
    'Study Time': user.averageSessionDuration,
  }));

  return (
    <motion.div 
      className="admin-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <motion.header 
        className="admin-header"
        variants={containerVariants}
      >
        <h1 className="admin-title">Admin Dashboard</h1>
      </motion.header>
      
      <motion.div 
        className="overview-grid"
        variants={staggeredGrid}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="stat-card"
          variants={gridItemVariants}
          whileHover="hover"
        >
          <h2 className="stat-title">Total Users</h2>
          <p className="stat-description">Active accounts on the platform</p>
          <p className="stat-value">{analytics.totalUsers}</p>
        </motion.div>

        <motion.div 
          className="stat-card"
          variants={gridItemVariants}
          whileHover="hover"
        >
          <h2 className="stat-title">Active Today</h2>
          <p className="stat-description">Users active in the last 24 hours</p>
          <p className="stat-value">{analytics.activeToday}</p>
        </motion.div>

        <motion.div 
          className="stat-card"
          variants={gridItemVariants}
          whileHover="hover"
        >
          <h2 className="stat-title">Avg. Session Duration</h2>
          <p className="stat-description">In minutes per user</p>
          <p className="stat-value">{Math.round(analytics.averageSessionDuration)}m</p>
        </motion.div>
      </motion.div>

      <motion.div 
        className="chart-container"
        variants={containerVariants}
      >
        <div className="chart-header">
          <h2 className="chart-title">User Activity</h2>
          <p className="chart-description">Sessions and average duration by user</p>
        </div>
        <div className="chart-content">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" label={{ value: 'Users', position: 'bottom' }} />
              <YAxis label={{ value: 'Time (minutes)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Study Time" fill="#8884d8" name="Avg Study Time (min)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div 
        className="table-container"
        variants={containerVariants}
      >
        <div className="table-header">
          <h2 className="chart-title">User Details</h2>
          <p className="chart-description">Detailed view of user activity</p>
        </div>
        <motion.table 
          className="data-table"
          variants={containerVariants}
        >
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
          <motion.tbody
            initial="hidden"
            animate="visible"
            variants={listVariants}
          >
            {analytics.userActivity.map(user => (
              <motion.tr 
                key={user._id}
                variants={listItemVariants}
                whileHover={{ backgroundColor: '#f9fafb' }}
              >
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{new Date(user.lastLogin).toLocaleDateString()}</td>
                <td>{user.totalSessions}</td>
                <td>{Math.round(user.averageSessionDuration)}m</td>
              </motion.tr>
            ))}
          </motion.tbody>
        </motion.table>
      </motion.div>
    </motion.div>
  );
};

export default Admin;
