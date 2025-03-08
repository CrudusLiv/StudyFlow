import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FiEdit3, FiUser, FiMail, FiLock, FiLogOut, FiCheck, FiX, 
  FiShield, FiKey, FiRefreshCcw, 
  FiUserCheck, FiEye, FiEyeOff 
} from 'react-icons/fi';
import '../styles/pages/Profile.css';

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
    avatar: ''
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
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
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
      
      // Add console.log to check the response data
      console.log('Profile data received:', response.data);
      
      // Make sure we set all fields from the response
      setProfile({
        name: response.data.name || '',
        email: response.data.email || '',
        username: response.data.username || '',
        avatar: response.data.avatar || ''
      });
      setLoading(false);
    } catch (error) {
      setMessage({ text: 'Error fetching profile', type: 'error' });
      setLoading(false);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/access');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage({ text: 'Error updating profile', type: 'error' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="profile-container">
      <div className="profile-wrapper">
        <div className="profile-header">
          <h1 className="profile-title">
            <FiUser className="profile-icon" />
            Profile
          </h1>
        </div>
        
        {message && (
          <div className={`message ${message.type === 'success' ? 'message-success' : 'message-error'}`}>
            {message.type === 'success' ? <FiCheck /> : <FiX />}
            {message.text}
          </div>
        )}
        
        <div className="profile-card">
          <div className="card-header">
            <h2 className="card-title">
              <FiUser className="card-icon" />
              User Information
            </h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="edit-button"
            >
              <FiEdit3 className="button-icon" />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiMail className="input-icon" />
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled={true}
              className="form-input readonly"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiUserCheck className="input-icon" />
              Username
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={!isEditing}
              className="form-input"
            />
          </div>


          {isEditing && (
            <button onClick={handleProfileUpdate} className="save-button">
              <FiCheck className="button-icon" />
              Save Changes
            </button>
          )}
        </div>

        <div className="profile-card">
          <div className="card-header">
            <h2 className="card-title">
              <FiLock className="card-icon" />
              Change Password
            </h2>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="edit-button"
            >
              <FiEdit3 className="button-icon" />
              {isChangingPassword ? 'Cancel' : 'Change'}
            </button>
          </div>

          {isChangingPassword && (
            <>
              <div className="form-group">
                <label className="form-label">
                  <FiKey className="input-icon" />
                  Current Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  >
                    {showPassword.current ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiShield className="input-icon" />
                  New Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  >
                    {showPassword.new ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiRefreshCcw className="input-icon" />
                  Confirm New Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <button onClick={handlePasswordChange} className="save-button">
                <FiCheck className="button-icon" />
                Update Password
              </button>
            </>
          )}
        </div>
      </div>
      <button onClick={handleLogout} className="logout-button">
        <FiLogOut className="button-icon" />
        Logout
      </button>
    </div>
  );
};

export default Profile;
