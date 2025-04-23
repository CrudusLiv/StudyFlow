import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiEdit3, FiUser, FiMail, FiLogOut, FiCheck, FiX,
  FiUserCheck
} from 'react-icons/fi';
import '../styles/pages/Profile.css';
import {
  pageVariants,
  containerVariants,
  listVariants,
  listItemVariants,
  buttonVariants,
  fadeIn
} from '../utils/animationConfig';

interface UserProfile {
  name: string;
  email: string;
  username: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    username: ''
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [retryCount]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setShowRefreshButton(false);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/access');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProfile({
        name: response.data.name || '',
        email: response.data.email || '',
        username: response.data.username || '',
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ text: 'Error fetching profile', type: 'error' });
      setShowRefreshButton(true);
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

  const handleRefresh = () => {
    setRetryCount(prev => prev + 1);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <motion.div
      className="profile-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <motion.div
        className="profile-wrapper"
        variants={containerVariants}
      >
        <motion.div
          className="profile-header"
          variants={fadeIn}
        >
          <h1 className="profile-title">
            <FiUser className="profile-icon" />
            Profile
          </h1>
        </motion.div>

        {message && (
          <motion.div
            className={`message ${message.type === 'success' ? 'message-success' : 'message-error'}`}
            variants={fadeIn}
          >
            {message.type === 'success' ? <FiCheck /> : <FiX />}
            {message.text}
          </motion.div>
        )}

        <motion.div
          className="profile-card"
          variants={containerVariants}
        >
          <motion.div
            className="profile-card-header"
            variants={fadeIn}
          >
            <h2 className="card-title">
              <FiUser className="card-icon" />
              User Information
            </h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="edit-profile-button"
            >
              <FiEdit3 className="button-icon" />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </motion.div>

          <motion.div
            className="form-group"
            variants={listItemVariants}
          >
            <label className="form-label">
              <FiMail className="input-icon" />
              Email (Google Account)
            </label>
            <input
              type="email"
              value={profile.email}
              disabled={true}
              className="form-input readonly"
            />
          </motion.div>

          <motion.div
            className="form-group"
            variants={listItemVariants}
          >
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
          </motion.div>

          {isEditing && (
            <motion.button
              onClick={handleProfileUpdate}
              className="save-profile-button"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <FiCheck className="button-icon" />
              Save Changes
            </motion.button>
          )}
        </motion.div>
        <motion.button
          onClick={handleLogout}
          className="profile-logout-button"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <FiLogOut className="button-icon" />
          Logout
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default Profile;
