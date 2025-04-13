import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX, FiClock, FiMapPin, FiCalendar, FiEdit2, FiSave, FiTag, FiUser, FiInfo } from 'react-icons/fi';
import '../styles/components/ClassModal.css';
import { motion } from 'framer-motion';
import { fadeIn } from '../utils/animationConfig';
import { toast } from 'react-toastify';
import { scheduleService } from '../services/scheduleService';

interface ClassModalProps {
  event: any;
  onClose: () => void;
}

const ClassModal: React.FC<ClassModalProps> = ({ event, onClose }) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isNewEvent, setIsNewEvent] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editClass, setEditClass] = useState<any>(null);
  
  // State for system-wide semester dates - for display only
  const [semesterStartDate, setSemesterStartDate] = useState<string>("");
  const [semesterEndDate, setSemesterEndDate] = useState<string>("");

  useEffect(() => {
    if (event) {
      setIsNewEvent(event.isNew === true);
      if (event.isNew) {
        setIsEditing(true);
      }
    }
    
    if (!event) {
      setEditClass(null);
      return;
    }
    
    // Load semester dates when modal opens
    loadSemesterDates();
    
    // Initialize form data from event
    const formData = {
      id: event._id || event.id,
      title: event.title || '',
      courseName: event.resource?.details?.courseName || event.title || '',
      courseCode: event.courseCode || event.resource?.courseCode || '',
      start: event.start || new Date(),
      end: event.end || new Date(new Date().getTime() + 60 * 60 * 1000),
      day: event.resource?.day || event.start?.toLocaleString('en-us', { weekday: 'long' }) || 'Monday',
      location: event.location || event.resource?.location || '',
      description: event.description || '',
      professor: event.resource?.details?.professor || '',
      recurring: event.resource?.recurring || false
    };
    
    setEditClass(formData);
  }, [event]);

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
        setSemesterStartDate(startDate.split('T')[0]);
        setSemesterEndDate(endDate.split('T')[0]);
      }
    } catch (error) {
      console.error('Error loading semester dates:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditClass({
      ...editClass,
      [name]: value
    });
  };
  
  const handleDateTimeChange = (field: string, value: Date) => {
    setEditClass({
      ...editClass,
      [field]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!editClass.courseName || !editClass.day || !editClass.start || !editClass.end) {
        setError('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        setIsLoading(false);
        return;
      }

      // Format the class data according to what the API expects
      const classData = {
        _id: editClass.id,
        courseName: editClass.courseName,
        courseCode: editClass.courseCode,
        startTime: `${editClass.start.getHours().toString().padStart(2, '0')}:${editClass.start.getMinutes().toString().padStart(2, '0')}`,
        endTime: `${editClass.end.getHours().toString().padStart(2, '0')}:${editClass.end.getMinutes().toString().padStart(2, '0')}`,
        location: editClass.location,
        professor: editClass.professor,
        day: editClass.day,
        // We'll use the system-wide semester dates, not individual dates
      };

      // Update or create class
      if (isNewEvent) {
        const result = await scheduleService.addClass(classData);
        console.log('Class added:', result);
        
        // Display success message
        toast.success('Class added successfully');
      } else {
        const result = await scheduleService.updateClass(classData);
        console.log('Class updated:', result);
        
        // Display success message
        toast.success('Class updated successfully');
      }

      // Notify that a class was updated - global event
      window.dispatchEvent(new CustomEvent('classChanged', {
        detail: { classData }
      }));
      
      onClose();
    } catch (error) {
      console.error('Error saving class:', error);
      setError('Failed to save class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!event || !editClass) return null;

  return (
    <div className="class-modal">
      <div className="class-modal-header">
        <h2>{isNewEvent ? 'Add New Class' : (isEditing ? 'Edit Class' : 'Class Details')}</h2>
        <button className="class-modal-close-btn" onClick={onClose}>
          <FiX />
        </button>
      </div>

      {error && (
        <motion.div 
          className="class-modal-error" 
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          {error}
        </motion.div>
      )}

      <div className="class-modal-content">
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="class-form">
              <div className="class-form-group">
                <label className="class-form-label">Class Name</label>
                <input
                  type="text"
                  name="courseName"
                  value={editClass.courseName}
                  onChange={handleChange}
                  className="class-form-input"
                  placeholder="E.g., Introduction to Computer Science"
                  required
                />
              </div>

              <div className="class-form-grid">
                <div className="class-form-group">
                  <label className="class-form-label">Course Code</label>
                  <input
                    type="text"
                    name="courseCode"
                    value={editClass.courseCode}
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
                    value={editClass.location}
                    onChange={handleChange}
                    className="class-form-input"
                    placeholder="Room number or building"
                  />
                </div>
              </div>

              <div className="class-form-group">
                <label className="class-form-label">Date & Time</label>
                <div className="class-form-grid">
                  <div className="class-form-group">
                    <input
                      type="datetime-local"
                      name="start"
                      value={editClass.start instanceof Date ? editClass.start.toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleDateTimeChange('start', new Date(e.target.value))}
                      className="class-form-input"
                      required
                    />
                  </div>
                  <div className="class-form-group">
                    <input
                      type="datetime-local"
                      name="end"
                      value={editClass.end instanceof Date ? editClass.end.toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleDateTimeChange('end', new Date(e.target.value))}
                      className="class-form-input"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="class-form-group">
                <label className="class-form-label">Description</label>
                <textarea
                  name="description"
                  value={editClass.description}
                  onChange={handleChange}
                  className="class-form-textarea"
                  placeholder="Add any additional details about this class"
                  rows={4}
                ></textarea>
              </div>

              <div className="class-form-group">
                <h3>Semester Dates</h3>
                <p>This class will use the system-wide semester dates.</p>
                <div className="semester-date-display">
                  <div>
                    <strong>Start:</strong> {semesterStartDate || 'Not set'}
                  </div>
                  <div>
                    <strong>End:</strong> {semesterEndDate || 'Not set'}
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
                <h3 className="class-title">
                  {event.title || (event.resource?.details?.courseName || 'Untitled Class')}
                </h3>

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

                {event.resource?.details?.professor && (
                  <div className="class-detail-item">
                    <div className="detail-icon">
                      <FiUser />
                    </div>
                    <div className="class-detail-content">
                      <div className="class-detail-title">Professor</div>
                      <div className="class-detail-value">{event.resource.details.professor}</div>
                    </div>
                  </div>
                )}

                {event.description && (
                  <div className="class-detail-item">
                    <div className="detail-icon">
                      <FiInfo />
                    </div>
                    <div className="class-detail-content">
                      <div className="class-detail-title">Description</div>
                      <div className="class-detail-value class-description">{event.description}</div>
                    </div>
                  </div>
                )}
                
                <div className="class-detail-item">
                  <div className="detail-icon">
                    <FiCalendar />
                  </div>
                  <div className="class-detail-content">
                    <div className="class-detail-title">Semester Dates</div>
                    <div className="class-detail-value">
                      {semesterStartDate && semesterEndDate ? (
                        <span>
                          {new Date(semesterStartDate).toLocaleDateString()} - {new Date(semesterEndDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>System-wide semester dates not set</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {event.resource?.recurring && (
                  <div className="recurrence-note">
                    <em>This class recurs weekly throughout the semester.</em>
                  </div>
                )}
              </div>
            </div>

            <div className="class-modal-actions">
              <button className="class-modal-edit-btn" onClick={() => setIsEditing(true)}>
                <FiEdit2 style={{ marginRight: '8px' }} />
                Edit
              </button>
              <button className="class-modal-close-btn" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClassModal;
