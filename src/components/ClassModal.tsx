import React from 'react';
import { CalendarEvent } from '../types/types';
import { FiClock, FiCalendar, FiBook, FiMapPin, FiUser } from 'react-icons/fi';

interface ClassModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

const ClassModal: React.FC<ClassModalProps> = ({ event, onClose }) => {
  // Add debugging log to verify the modal is receiving data
  console.log('ClassModal receiving event:', event);

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

  // Get necessary data with fallbacks for all properties
  const title = event?.title || 'Untitled Class';
  const startTime = event?.start ? formatTime(event.start) : '';
  const endTime = event?.end ? formatTime(event.end) : '';
  const date = event?.start ? formatDate(event.start) : '';
  const courseCode = event?.courseCode || event?.resource?.courseCode || '';
  const location = event?.location || event?.resource?.location || '';
  const professor = event?.resource?.details?.professor || '';
  const day = event?.resource?.day || '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="class-details">
          {date && (
            <div className="class-detail-item">
              <FiCalendar className="detail-icon" />
              <div>
                <strong>Date:</strong> {date}
              </div>
            </div>
          )}

          {day && (
            <div className="class-detail-item">
              <FiCalendar className="detail-icon" />
              <div>
                <strong>Day:</strong> {day}
              </div>
            </div>
          )}

          {(startTime && endTime) && (
            <div className="class-detail-item">
              <FiClock className="detail-icon" />
              <div>
                <strong>Time:</strong> {startTime} - {endTime}
              </div>
            </div>
          )}

          {courseCode && (
            <div className="class-detail-item">
              <FiBook className="detail-icon" />
              <div>
                <strong>Course:</strong> {courseCode}
              </div>
            </div>
          )}

          {location && (
            <div className="class-detail-item">
              <FiMapPin className="detail-icon" />
              <div>
                <strong>Location:</strong> {location}
              </div>
            </div>
          )}
          
          {professor && (
            <div className="class-detail-item">
              <FiUser className="detail-icon" />
              <div>
                <strong>Professor:</strong> {professor}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-button close-modal-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassModal;
