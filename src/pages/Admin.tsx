import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BsPersonFill, BsBook, BsGear, BsGraphUp, BsSearch, BsFilter, BsBell } from "react-icons/bs";

// Initialize axios instance with base configuration for API calls
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}

});

const Admin = () => {
    // Core state management
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);          // Store user data
    const [sessions, setSessions] = useState([]);    // Store session data
    const [loading, setLoading] = useState(false);   // Loading state for async operations
    const [selectedTab, setSelectedTab] = useState("users");  // Active tab tracker
    const [searchQuery, setSearchQuery] = useState(""); // Search functionality
    // Dashboard statistics state
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeSessions: 0,
        totalModules: 0,
        // Future metric: progressRate: 0,
    });

    // Fetch dashboard statistics on component mount
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await api.get("/admin/stats");
                setStats(response.data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        };
        fetchStats();
    }, []);

    // Fetch users data from API
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get("/admin/users");
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
        setLoading(false);
    };

    // Fetch sessions data from API
    const fetchSessions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get("/admin/sessions");
            setSessions(response.data);
        } catch (error) {
            console.error("Error fetching sessions:", error);
        }
        setLoading(false);
    };

    // Handle user deletion
    const handleDeleteUser = async (userId) => {
        try {
            await api.delete(`/admin/users/${userId}`);
            fetchUsers(); // Refresh user list
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    // Handle user status updates (active/inactive)
    const handleUpdateUserStatus = async (userId, status) => {
        try {
            await api.patch(`/admin/users/${userId}`, { status });
            fetchUsers(); // Refresh user list
        } catch (error) {
            console.error("Error updating user status:", error);
        }
    };

    // Load data based on selected tab
    useEffect(() => {
        if (selectedTab === 'users') {
            fetchUsers();
        } else if (selectedTab === 'sessions') {
            fetchSessions();
        }
    }, [selectedTab]);

    // Reusable StatCard component for dashboard metrics
    const StatCard = ({ icon: Icon, title, value, trend }) => (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                        <Icon className="text-indigo-600 text-xl" />
                    </div>
                    <div>
                        <h3 className="text-gray-500 text-sm">{title}</h3>
                        <p className="text-xl sm:text-2xl font-bold text-gray-800">{value}</p>
                    </div>
                </div>
                {trend && (
                    <span className={`text-sm ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-gray-50">
            {/* Header with search and notifications */}
            <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-8 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">StudyFlow Admin</h1>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full sm:w-auto pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <BsSearch className="absolute left-3 top-3 text-gray-400" />
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 relative">
                                <BsBell className="text-gray-600 text-xl" />
                                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="p-4 sm:p-8">
                {/* Statistics cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <StatCard
                        icon={BsPersonFill}
                        title="Total Users"
                        value={stats.totalUsers}
                        trend={12}
                    />
                    <StatCard
                        icon={BsBook}
                        title="Active Sessions"
                        value={stats.activeSessions}
                        trend={-5}
                    />
                    <StatCard
                        icon={BsBook}
                        title="Total Modules"
                        value={stats.totalModules}
                        trend={15}
                    />
                </div>

                {/* Content tabs and data display */}
                <div className="bg-white rounded-xl shadow-sm min-h-[calc(100vh-300px)] p-4 sm:p-6">
                    {/* Tab navigation */}
                    <div className="flex flex-wrap items-center justify-between mb-6">
                        <div className="flex flex-wrap gap-2">
                            <button
                                className={`px-4 py-2 rounded-lg ${selectedTab === 'users' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
                                onClick={() => setSelectedTab('users')}
                            >
                                Users
                            </button>
                            <button
                                className={`px-4 py-2 rounded-lg ${selectedTab === 'sessions' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
                                onClick={() => setSelectedTab('sessions')}
                            >
                                Sessions
                            </button>
                            <button
                                className={`px-4 py-2 rounded-lg ${selectedTab === 'settings' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
                                onClick={() => setSelectedTab('settings')}
                            >
                                Settings
                            </button>
                        </div>
                    </div>

                    {/* Tab content */}
                    <div className="mt-4">
                        {/* Users table */}
                        {selectedTab === 'users' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {/* existing action buttons */}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Sessions table */}
                        {selectedTab === 'sessions' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sessions.map((session) => (
                                            <tr key={session.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{session.userName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{session.moduleName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{session.duration}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div
                                                            className="bg-indigo-600 h-2.5 rounded-full"
                                                            style={{ width: `${session.progress}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Settings panel */}
                        {selectedTab === 'settings' && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Settings</h3>
                                    {/* Settings controls placeholder */}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
