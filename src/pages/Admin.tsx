import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

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

  // Transform analytics data for the chart
  const activityData = analytics?.userActivity.map(user => ({
    name: user.name,
    sessions: user.totalSessions,
    average: Math.round(user.averageSessionDuration)
  })) || [];

  const transformUserToActivity = (user: User): UserActivity => ({
    _id: user._id,
    id: user._id, // Add id field to match UserActivity interface
    name: user.name,
    email: user.email,
    role: user.role,
    lastLogin: user.lastLogin,
    totalSessions: 0, // Default values for new fields
    averageSessionDuration: 0
  });
 
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>Active accounts on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Today</CardTitle>
            <CardDescription>Users active in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.activeToday}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg. Session Duration</CardTitle>
            <CardDescription>In minutes per user</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Math.round(analytics.averageSessionDuration)}m
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>Sessions and average duration by user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#8884d8" 
                  name="Total Sessions"
                />
                <Line 
                  type="monotone" 
                  dataKey="average" 
                  stroke="#82ca9d" 
                  name="Avg Duration (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>Detailed view of user activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow key="header">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Total Sessions</TableHead>
                  <TableHead>Avg. Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.userActivity.map((user: UserActivity) => (
                  <TableRow key={user._id || user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{user.totalSessions}</TableCell>
                    <TableCell>
                      {Math.round(user.averageSessionDuration)}m
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
