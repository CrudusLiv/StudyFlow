import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { fadeIn, modalVariants } from '../utils/animationConfig';
import '../styles/components/ModalBackdrop.css';

interface SemesterDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const SemesterDatesModal: React.FC<SemesterDatesModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load current semester dates when modal opens
    if (isOpen) {
      loadSemesterDates();
    }
  }, [isOpen]);

  const loadSemesterDates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/schedule/semester-dates', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.semesterDates) {
        const { startDate, endDate } = response.data.semesterDates;
        setStartDate(startDate.split('T')[0]); // Format as YYYY-MM-DD
        setEndDate(endDate.split('T')[0]); // Format as YYYY-MM-DD
      } else {
        // Set default dates if none exist
        const today = new Date();
        const fourMonthsLater = new Date();
        fourMonthsLater.setMonth(today.getMonth() + 4);
        
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(fourMonthsLater.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error loading semester dates:', error);
      setError('Failed to load semester dates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!startDate || !endDate) {
        setError('Both start and end dates are required');
        return;
      }
      
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      if (endDateObj <= startDateObj) {
        setError('End date must be after start date');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/api/schedule/semester-dates', 
        { startDate, endDate },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (onSaved) {
        onSaved();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving semester dates:', error);
      setError('Failed to save semester dates');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="modal"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="modal-header">
          <h2>Set Semester Dates</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {error && (
            <motion.div 
              className="error-message"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              {error}
            </motion.div>
          )}
          
          <div className="form-group">
            <label htmlFor="startDate" className="form-label">Semester Start Date</label>
            <input
              id="startDate"
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="endDate" className="form-label">Semester End Date</label>
            <input
              id="endDate"
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <p className="info-text">
            These dates will be used to estimate due dates for assignments when they're not explicitly provided.
          </p>
        </div>
        
        <div className="modal-footer">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="save-button"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Semester Dates'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SemesterDatesModal;
