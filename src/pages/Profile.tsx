import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiEdit3, FiUser, FiMail, FiLogOut, FiCheck, FiX,
  FiUserCheck, FiUpload, FiTrash2
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
  avatar?: string;
  profilePicture?: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    username: '',
    avatar: ''
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const getFullImageUrl = (profilePicturePath: string) => {
    if (!profilePicturePath) return null;
    if (profilePicturePath.startsWith('http')) return profilePicturePath;
    return `http://localhost:5000${profilePicturePath}`;
  };

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

      setProfile({
        name: response.data.name || '',
        email: response.data.email || '',
        username: response.data.username || '',
        profilePicture: response.data.profilePicture || ''
      });

      if (response.data.profilePicture) {
        const fullImageUrl = getFullImageUrl(response.data.profilePicture);
        setProfilePicture(fullImageUrl);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
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

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ text: 'Please upload an image file', type: 'error' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: 'Image size should be less than 5MB', type: 'error' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/user/profile-picture',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const fullImageUrl = getFullImageUrl(response.data.profilePictureUrl);
      setProfilePicture(fullImageUrl);
      setProfile(prev => ({ ...prev, profilePicture: response.data.profilePictureUrl }));
      setMessage({ text: 'Profile picture updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setMessage({ text: 'Failed to upload profile picture', type: 'error' });
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete('http://localhost:5000/api/user/profile-picture', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProfilePicture(null);
      setMessage({ text: 'Profile picture removed successfully!', type: 'success' });
    } catch (error) {
      console.error('Error removing profile picture:', error);
      setMessage({ text: 'Failed to remove profile picture', type: 'error' });
    }
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
          className="profile-picture-section"
          variants={fadeIn}
        >
          <div className="profile-picture-container">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="profile-picture"
              />
            ) : (
              <div className="profile-picture-placeholder">
                <FiUser size={40} />
              </div>
            )}
            <div className="profile-picture-overlay">
              <button
                className="picture-upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload />
                <span>Upload</span>
              </button>
              {profilePicture && (
                <button
                  className="picture-remove-button"
                  onClick={handleRemoveProfilePicture}
                >
                  <FiTrash2 />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleProfilePictureChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </motion.div>
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
            className="card-header"
            variants={fadeIn}
          >
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
              className="save-button"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <FiCheck className="button-icon" />
              Save Changes
            </motion.button>
          )}
        </motion.div>
      </motion.div>
      <motion.button
        onClick={handleLogout}
        className="logout-button"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <FiLogOut className="button-icon" />
        Logout
      </motion.button>
    </motion.div>
  );
};

export default Profile;
