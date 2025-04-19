import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';
import '../styles/pages/Admin.css';
import { FaChartLine, FaChartPie, FaUsers, FaUserClock, FaClock, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { BiError } from 'react-icons/bi';
import AdminDebug from '../components/AdminDebug';
import { processUserData, extractAnalytics, directServerResponseHandler } from '../utils/adminUtils';

import { 
  pageVariants, 
  containerVariants, 
  listVariants, 
  listItemVariants,
  staggeredGrid,
  gridItemVariants
} from '../utils/animationConfig';

interface UserActivity {
  _id: string;  // This should match what's coming from the server
  id?: string;  // Add optional id field to handle both formats
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

// Colors for the pie chart
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];

const Admin: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' | null }>({
    key: '',
    direction: null
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Make the direct API call
        const response = await axios.get('http://localhost:5000/api/admin/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Log the complete raw response
        console.log('Complete raw server response:', JSON.stringify(response.data, null, 2));
        
        // Use the direct response handler
        const processedData = directServerResponseHandler(response.data);
        
        // Update state with the processed data
        setAnalytics(processedData);
      } catch (error: any) {
        setError(error.response?.data?.error || 'Failed to fetch analytics data');
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Responsive design helpers
  const getResponsiveMargin = () => {
    const width = window.innerWidth;
    if (width <= 480) {
      return { top: 5, right: 5, left: 20, bottom: 50 };
    } else if (width <= 768) {
      return { top: 10, right: 10, left: 30, bottom: 60 };
    } else if (width <= 1024) {
      return { top: 15, right: 20, left: 40, bottom: 70 };
    }
    return { top: 20, right: 30, left: 50, bottom: 80 };
  };

  const getChartDimensions = () => {
    const width = window.innerWidth;
    if (width <= 480) {
      return { height: 250, fontSize: 10, barSize: 30 };
    } else if (width <= 768) {
      return { height: 300, fontSize: 12, barSize: 40 };
    }
    return { height: 400, fontSize: 14, barSize: 60 };
  };

  // Sorting function for table
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' | null = 'ascending';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.direction === 'descending') {
        direction = null;
      }
    }
    
    setSortConfig({ key, direction });
  };

  // Get sort icon based on current sort state
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <FaSort className="sort-icon" />;
    if (sortConfig.direction === 'ascending') return <FaSortUp className="sort-icon active" />;
    if (sortConfig.direction === 'descending') return <FaSortDown className="sort-icon active" />;
    return <FaSort className="sort-icon" />;
  };

  // Prepare filtered and sorted user data
  const filteredAndSortedUsers = useMemo(() => {
    if (!analytics) return [];

    // First filter the users
    let result = analytics.userActivity.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Then sort them if needed
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a: any, b: any) => {
        // Handle date sorting specially
        if (sortConfig.key === 'lastLogin') {
          const dateA = new Date(a[sortConfig.key]).getTime();
          const dateB = new Date(b[sortConfig.key]).getTime();
          return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }
        
        // Handle string vs number sorting
        if (typeof a[sortConfig.key] === 'string') {
          return sortConfig.direction === 'ascending' 
            ? a[sortConfig.key].localeCompare(b[sortConfig.key])
            : b[sortConfig.key].localeCompare(a[sortConfig.key]);
        } else {
          return sortConfig.direction === 'ascending' 
            ? a[sortConfig.key] - b[sortConfig.key]
            : b[sortConfig.key] - a[sortConfig.key];
        }
      });
    }

    return result;
  }, [analytics, searchTerm, sortConfig]);

  // Prepare activity data for bar chart
  const activityData = useMemo(() => {
    if (!analytics) return [];
    return analytics.userActivity.map(user => ({
      name: user.name.split(' ')[0],
      'Study Time': user.averageSessionDuration,
    }));
  }, [analytics]);

  // Prepare role distribution data for pie chart
  const roleData = useMemo(() => {
    if (!analytics) return [];
    return analytics.userActivity.reduce((acc: {name: string, value: number}[], user) => {
      const existingRole = acc.find(item => item.name === user.role);
      if (existingRole) {
        existingRole.value += 1;
      } else {
        acc.push({ name: user.role, value: 1 });
      }
      return acc;
    }, []);
  }, [analytics]);

  // Loading state component
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Error state component
  if (error) {
    return (
      <div className="error-container">
        <BiError size={50} color="#ef4444" />
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // No data state
  if (!analytics) {
    return (
      <div className="no-data-container">
        <h2>No Data Available</h2>
        <p>There is no analytics data to display at this time.</p>
      </div>
    );
  }

  // Update the stat cards to show values correctly
  return (
    <motion.div 
      className="admin-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      {/* Add the debug component in development */}
      {process.env.NODE_ENV !== 'production' && <AdminDebug />}
      
      <motion.header 
        className="admin-header"
        variants={containerVariants}
      >
        <h1 className="admin-title">Admin Dashboard</h1>
      </motion.header>
      
      {/* Stats Overview Cards */}
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
          <div className="stat-header">
            <FaUsers className="stat-icon" />
            <h2 className="stat-title">Total Users</h2>
          </div>
          <p className="stat-description">Active accounts on the platform</p>
          <p className="stat-value">{analytics.totalUsers || 0}</p>
        </motion.div>

        <motion.div 
          className="stat-card"
          variants={gridItemVariants}
          whileHover="hover"
        >
          <div className="stat-header">
            <FaUserClock className="stat-icon" />
            <h2 className="stat-title">Active Today</h2>
          </div>
          <p className="stat-description">Users active in the last 24 hours</p>
          <p className="stat-value">{analytics.activeToday}</p>
        </motion.div>

        <motion.div 
          className="stat-card"
          variants={gridItemVariants}
          whileHover="hover"
        >
          <div className="stat-header">
            <FaClock className="stat-icon" />
            <h2 className="stat-title">Avg. Session Duration</h2>
          </div>
          <p className="stat-description">In minutes per user</p>
          <p className="stat-value">{Math.round(analytics.averageSessionDuration)}m</p>
        </motion.div>
      </motion.div>

      {/* User Activity Chart
      <motion.div 
        className="chart-section"
        variants={containerVariants}
      >
        <h3 className="section-title">
          <FaChartLine className="section-icon" />User Activity
        </h3>
        <div className="chart-wrapper" style={{ height: getChartDimensions().height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={activityData}
              margin={getResponsiveMargin()}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name"
                interval={0}
                tick={{ 
                  fill: '#6b7280', 
                  fontSize: getChartDimensions().fontSize,
                  width: window.innerWidth <= 480 ? 60 : 100 
                }}
                tickLine={{ stroke: '#e5e7eb' }}
                axisLine={{ stroke: '#e5e7eb' }}
                height={window.innerWidth <= 480 ? 60 : 80}
                angle={-45}
                textAnchor="end"
                label={{ 
                  value: "Users", 
                  position: "bottom", 
                  offset: window.innerWidth <= 480 ? 30 : 50,
                  style: { fill: '#4b5563', fontSize: window.innerWidth <= 480 ? 12 : 14 }
                }}
              />
              <YAxis 
                tick={{ 
                  fill: '#6b7280', 
                  fontSize: window.innerWidth <= 480 ? 10 : 12 
                }}
                tickLine={{ stroke: '#e5e7eb' }}
                axisLine={{ stroke: '#e5e7eb' }}
                label={{ 
                  value: "Study Time (min)", 
                  angle: -90, 
                  position: "insideLeft",
                  offset: window.innerWidth <= 480 ? -25 : -35,
                  style: { 
                    fill: '#4b5563',
                    fontSize: window.innerWidth <= 480 ? 12 : 14
                  }
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                  fontSize: window.innerWidth <= 480 ? '12px' : '14px'
                }}
                cursor={{ fill: 'rgba(129, 140, 248, 0.1)' }}
              />
              <Bar 
                dataKey="Study Time" 
                fill="#8884d8" 
                name="Avg Study Time (min)"
                radius={[8, 8, 0, 0]}
                maxBarSize={getChartDimensions().barSize}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div> */}

      {/* User Roles Distribution Chart */}
      <motion.div 
        className="chart-section"
        variants={containerVariants}
      >
        <h3 className="section-title">
          <FaChartPie className="section-icon" />User Roles Distribution
        </h3>
        <div className="chart-wrapper" style={{ height: getChartDimensions().height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={window.innerWidth <= 480 ? 60 : 80}
                fill="#8884d8"
                dataKey="value"
                animationDuration={1500}
                animationEasing="ease-in-out"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} users`, name]}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                  fontSize: window.innerWidth <= 480 ? '12px' : '14px'
                }}
              />
              <Legend 
                layout="horizontal" 
                verticalAlign="bottom" 
                align="center"
                wrapperStyle={{
                  fontSize: window.innerWidth <= 480 ? '10px' : '12px',
                  paddingTop: '20px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      
      {/* User Table Section */}
      <motion.div 
        className="table-section"
        variants={containerVariants}
      >
        <div className="table-header">
          <h3 className="section-title">User Details</h3>
          <p className="chart-description">Detailed view of user activity</p>
          
          <div className="search-container">
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="table-container">
          <motion.table 
            className="data-table"
            variants={containerVariants}
          >
            <thead className="table-head">
              <tr>
                <th onClick={() => requestSort('name')}>
                  Name {getSortIcon('name')}
                </th>
                <th onClick={() => requestSort('email')}>
                  Email {getSortIcon('email')}
                </th>
                <th onClick={() => requestSort('role')}>
                  Role {getSortIcon('role')}
                </th>
                <th onClick={() => requestSort('lastLogin')}>
                  Last Active {getSortIcon('lastLogin')}
                </th>
                <th onClick={() => requestSort('totalSessions')}>
                  Total Sessions {getSortIcon('totalSessions')}
                </th>
                <th onClick={() => requestSort('averageSessionDuration')}>
                  Avg. Duration {getSortIcon('averageSessionDuration')}
                </th>
              </tr>
            </thead>
            <motion.tbody
              initial="hidden"
              animate="visible"
              variants={listVariants}
              className="table-body"
            >
              {filteredAndSortedUsers.length > 0 ? (
                filteredAndSortedUsers.map((user, index) => {
                  // Add a unique key with fallback to index
                  const key = user._id || `user-${index}`;
                  
                  return (
                    <motion.tr 
                      key={key}
                      variants={listItemVariants}
                      whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
                      className="table-row"
                    >
                      <td>{user.name || 'N/A'}</td>
                      <td>{user.email || 'N/A'}</td>
                      <td>
                        <span className={`role-badge role-${(user.role || 'user').toLowerCase()}`}>
                          {user.role || 'User'}
                        </span>
                      </td>
                      <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                      <td>{user.totalSessions !== undefined ? user.totalSessions : 0}</td>
                      <td>{user.averageSessionDuration !== undefined ? 
                        `${Math.round(user.averageSessionDuration)}m` : '0m'}</td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr className="empty-row">
                  <td colSpan={6}>
                    <div className="no-results">
                      <p>No users match your search criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </motion.tbody>
          </motion.table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Admin;
