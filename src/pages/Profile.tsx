import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  name: string;
  email: string;
  username: string;
  avatar?: string;
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    username: '',
  });
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/access');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setLoading(false);
    } catch (error) {
      setMessage({ text: 'Error fetching profile', type: 'error' });
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:5000/api/user/profile',
        profile,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setProfile(response.data);
      setIsEditing(false);
    } catch (error) {
      setMessage({ text: 'Error updating profile', type: 'error' });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        'http://localhost:5000/api/user/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
    } catch (error) {
      setMessage({ text: 'Error updating password', type: 'error' });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Profile Settings</h1>

        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                disabled={!isEditing}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                disabled={!isEditing}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!isEditing}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {isEditing && (
              <button
                onClick={handleProfileUpdate}
                className="w-full py-2 px-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Password Change Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Change Password</h2>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              {isChangingPassword ? 'Cancel' : 'Change'}
            </button>
          </div>

          {isChangingPassword && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                className="w-full py-2 px-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                Update Password
              </button>
            </div>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
