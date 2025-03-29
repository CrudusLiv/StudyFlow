import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent } from '../types/types';
import { FiClock, FiCalendar, FiBook, FiMapPin, FiUser, FiX, FiTag, FiRepeat, FiSave } from 'react-icons/fi';
import { modalVariants } from '../utils/animationConfig';
import '../styles/components/ClassModal.css';

interface ClassModalProps {
  event: CalendarEvent;
  onClose: () => void;
  isNewEvent?: boolean;
  onSave?: (updatedEvent: CalendarEvent) => void;
}

const ClassModal: React.FC<ClassModalProps> = ({ 
  event, 
  onClose, 
  isNewEvent = false,
  onSave 
}) => {
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: event.title || '',
    courseCode: event.courseCode || '',
    location: event.location || '',
    start: event.start || new Date(),
    end: event.end || new Date(Date.now() + 60 * 60 * 1000),
    description: event.description || ''
  });

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle date/time changes
  const handleDateTimeChange = (name: string, value: Date) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ...event,
        ...formData
      });
    }
    onClose();
  };

  // Format time for display
  const formatTime = (date: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date for display
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
                <label className="class-form-label">Date & Time</label>
                <div className="class-form-grid">
                  <div className="class-form-group">
                    <input
                      type="datetime-local"
                      name="start"
                      value={formData.start instanceof Date ? formData.start.toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleDateTimeChange('start', new Date(e.target.value))}
                      className="class-form-input"
                      required
                    />
                  </div>
                  <div className="class-form-group">
                    <input
                      type="datetime-local"
                      name="end"
                      value={formData.end instanceof Date ? formData.end.toISOString().slice(0, 16) : ''}
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
                  value={formData.description}
                  onChange={handleChange}
                  className="class-form-textarea"
                  placeholder="Add any additional details about this class"
                  rows={4}
                ></textarea>
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
                <button className="class-modal-save-btn">Add to Calendar</button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ClassModal;
