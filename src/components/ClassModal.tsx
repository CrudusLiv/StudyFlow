import React from 'react';
import { CalendarEvent } from '../types/types';
import { FiClock, FiCalendar, FiBook, FiMapPin } from 'react-icons/fi';

interface ClassModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

const ClassModal: React.FC<ClassModalProps> = ({ event, onClose }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Debug log to check event data
  console.log('Class Modal Event:', {
    title: event.title,
    courseCode: event.courseCode,
    resourceCourseCode: event.resource?.courseCode,
    fullEvent: event
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event.title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="class-details">
            <div className="class-detail-item">
              <FiCalendar className="detail-icon" />
              <div>
                <strong>Date:</strong> {formatDate(event.start)}
              </div>
            </div>

            <div className="class-detail-item">
              <FiClock className="detail-icon" />
              <div>
                <strong>Time:</strong> {formatTime(event.start)} - {formatTime(event.end)}
              </div>
            </div>

            <div className="class-detail-item">
              <FiBook className="detail-icon" />
              <div>
                <strong>Course:</strong> {event.courseCode || event.resource?.courseCode}
              </div>
            </div>

            {event.location && (
              <div className="class-detail-item">
                <FiMapPin className="detail-icon" />
                <div>
                  <strong>Location:</strong> {event.location}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-button secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassModal;
