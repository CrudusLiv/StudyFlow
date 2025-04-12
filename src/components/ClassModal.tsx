import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent } from '../types/types';
import { FiClock, FiCalendar, FiBook, FiMapPin, FiUser, FiX, FiTag, FiRepeat, FiSave } from 'react-icons/fi';
import { modalVariants } from '../utils/animationConfig';
import '../styles/components/ClassModal.css';
import axios from 'axios';

interface ClassModalProps {
  event: CalendarEvent;
  onClose: () => void;
  isNewEvent?: boolean;
  onSave?: (updatedEvent: CalendarEvent) => void;
  isOpen: boolean;
  editClass?: CalendarEvent;
  onSaved?: () => void;
}

const ClassModal: React.FC<ClassModalProps> = ({ 
  event, 
  onClose, 
  isNewEvent = false,
  onSave,
  isOpen,
  editClass,
  onSaved
}) => {
  const [formData, setFormData] = useState<any>({
    title: event.title || '',
    courseCode: event.courseCode || '',
    location: event.location || '',
    start: event.start || new Date(),
    end: event.end || new Date(Date.now() + 60 * 60 * 1000),
    description: event.description || '',
    // Extract day of the week from the start date if available
    day: event.resource?.day || (event.start ? new Date(event.start).toLocaleDateString('en-US', { weekday: 'long' }) : ''),
    // Extract times for API format
    startTime: event.start ? event.start.toTimeString().substring(0, 5) : '',
    endTime: event.end ? event.end.toTimeString().substring(0, 5) : '',
    // Adding courseName field for API compatibility
    courseName: event.title || '',
    professor: event.resource?.details?.professor || '',
    // Initialize semester dates, we'll fill this from the API
    semesterDates: {
      startDate: null,
      endDate: null
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadSemesterDates();
    }
  }, [isOpen, editClass]);

  const loadSemesterDates = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/schedule/semester-dates', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.semesterDates) {
        const { startDate, endDate } = response.data.semesterDates;
        // Update the semesterDates in formData
        setFormData(prevData => ({
          ...prevData,
          semesterDates: {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
          }
        }));
      }
    } catch (error) {
      console.error('Error loading semester dates:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDateTimeChange = (name: string, value: Date) => {
    setFormData({
      ...formData,
      [name]: value
    });
    
    // If start or end time changes, update the corresponding time string
    if (name === 'start' || name === 'end') {
      const timeKey = name === 'start' ? 'startTime' : 'endTime';
      setFormData(prevData => ({
        ...prevData,
        [timeKey]: value.toTimeString().substring(0, 5)
      }));
      
      // If start date changes, update the day of week
      if (name === 'start') {
        setFormData(prevData => ({
          ...prevData,
          day: value.toLocaleDateString('en-US', { weekday: 'long' })
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Prepare data for API
      const classData = {
        courseName: formData.title,
        courseCode: formData.courseCode,
        location: formData.location,
        professor: formData.professor || '',
        startTime: formData.startTime,
        endTime: formData.endTime,
        day: formData.day,
        semesterDates: formData.semesterDates,
        description: formData.description
      };
      
      // Send directly to API
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/schedule/classes', classData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Class created successfully:', response.data);
      
      // Notify parent components
      if (onSave) {
        onSave({
          ...event,
          ...formData
        });
      }
      
      // Call onSaved callback if provided
      if (onSaved) {
        onSaved();
      }
      
      // Trigger custom event to notify schedule to refresh
      window.dispatchEvent(new CustomEvent('classAdded', {
        detail: { classData }
      }));
      
      onClose();
    } catch (error) {
      console.error('Error saving class:', error);
      alert('Failed to save class. Please try again.');
    }
  };

  const formatTime = (date: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <motion.div 
      className="class-modal-backdrop" 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="class-modal"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="class-modal-header">
          <h2>
            <FiBook /> 
            {isNewEvent ? 'Add New Class' : event.title || 'Class Details'}
          </h2>
          <button className="close-button" onClick={onClose}><FiX /></button>
        </div>

        {isNewEvent || onSave ? (
          <form onSubmit={handleSubmit}>
            <div className="class-modal-body">
              <div className="class-form-group">
                <label className="class-form-label">Class Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="class-form-input"
                  placeholder="Enter class title"
                  required
                />
              </div>

              <div className="class-form-grid">
                <div className="class-form-group">
                  <label className="class-form-label">Course Code</label>
                  <input
                    type="text"
                    name="courseCode"
                    value={formData.courseCode}
                    onChange={handleChange}
                    className="class-form-input"
                    placeholder="E.g., CS101"
                  />
                </div>

                <div className="class-form-group">
                  <label className="class-form-label">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="class-form-input"
                    placeholder="Room number or building"
                  />
                </div>
              </div>
              
              <div className="class-form-group">
                <label className="class-form-label">Day of Week</label>
                <select
                  name="day"
                  value={formData.day}
                  onChange={handleChange}
                  className="class-form-input"
                  required
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>

              <div className="class-form-grid">
                <div className="class-form-group">
                  <label className="class-form-label">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="class-form-input"
                    required
                  />
                </div>
                <div className="class-form-group">
                  <label className="class-form-label">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="class-form-input"
                    required
                  />
                </div>
              </div>

              <div className="class-form-group">
                <label className="class-form-label">Professor (Optional)</label>
                <input
                  type="text"
                  name="professor"
                  value={formData.professor}
                  onChange={handleChange}
                  className="class-form-input"
                  placeholder="Professor name"
                />
              </div>

              <div className="class-form-group">
                <label className="class-form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="class-form-textarea"
                  placeholder="Add any additional details about this class"
                  rows={4}
                ></textarea>
              </div>

              <div className="class-form-group">
                <h3>Semester Dates</h3>
                <p className="info-text">
                  This class will use the system-wide semester dates.
                </p>
                <div className="semester-date-display">
                  <div>
                    <strong>Start:</strong> {formData.semesterDates.startDate ? formData.semesterDates.startDate.toLocaleDateString() : 'Not set'}
                  </div>
                  <div>
                    <strong>End:</strong> {formData.semesterDates.endDate ? formData.semesterDates.endDate.toLocaleDateString() : 'Not set'}
                  </div>
                </div>
                <p className="info-text">
                  To change semester dates, use the "Set Semester Dates" button on the schedule page.
                </p>
              </div>
            </div>

            <div className="class-modal-actions">
              <div className="class-modal-buttons">
                <button type="button" className="class-modal-cancel-btn" onClick={onClose}>Cancel</button>
              </div>
              <div className="class-modal-buttons">
                <button type="submit" className="class-modal-save-btn">
                  <FiSave style={{ marginRight: '8px' }} />
                  {isNewEvent ? 'Add Class' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <div className="class-modal-body">
              <div className="class-details">
                {event.start && (
                  <div className="class-detail-item">
                    <div className="detail-icon">
                      <FiCalendar />
                    </div>
                    <div className="class-detail-content">
                      <div className="class-detail-title">Date</div>
                      <div className="class-detail-value">{formatDate(event.start)}</div>
                    </div>
                  </div>
                )}

                {event.start && event.end && (
                  <div className="class-detail-item">
                    <div className="detail-icon">
                      <FiClock />
                    </div>
                    <div className="class-detail-content">
                      <div className="class-detail-title">Time</div>
                      <div className="class-detail-value">{formatTime(event.start)} - {formatTime(event.end)}</div>
                    </div>
                  </div>
                )}

                {event.courseCode && (
                  <div className="class-detail-item">
                    <div className="detail-icon">
                      <FiTag />
                    </div>
                    <div className="class-detail-content">
                      <div className="class-detail-title">Course</div>
                      <div className="class-detail-value">{event.courseCode}</div>
                    </div>
                  </div>
                )}

                {event.location && (
                  <div className="class-detail-item">
                    <div className="detail-icon">
                      <FiMapPin />
                    </div>
                    <div className="class-detail-content">
                      <div className="class-detail-title">Location</div>
                      <div className="class-detail-value">{event.location}</div>
                    </div>
                  </div>
                )}
                
                {event.description && (
                  <div className="class-detail-item">
                    <div className="detail-icon">
                      <FiBook />
                    </div>
                    <div className="class-detail-content">
                      <div className="class-detail-title">Description</div>
                      <div className="class-detail-value">{event.description}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="class-modal-actions">
              <div className="class-modal-buttons">
                <button className="class-modal-cancel-btn" onClick={onClose}>Close</button>
              </div>
              <div className="class-modal-buttons">
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ClassModal;
