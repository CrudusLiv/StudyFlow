import React from 'react';
import { CalendarEvent } from '../types/types';
import { FiClock, FiCalendar, FiBook, FiTag, FiInfo, FiMapPin } from 'react-icons/fi';

interface TaskModalProps {
  task: CalendarEvent;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  console.log('Task received in modal:', task); // Debug log

  const formatTime = (date: Date | string | undefined) => {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';

      return dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const isClassEvent = task?.category === 'class';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task?.title || 'Untitled Event'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="task-details">
          {task?.start && (
            <div className="task-detail-item">
              <FiCalendar className="detail-icon" />
              <div>
                <strong>Date:</strong> {formatDate(task.start)}
              </div>
            </div>
          )}

          {task?.start && task?.end && (
            <div className="task-detail-item">
              <FiClock className="detail-icon" />
              <div>
                <strong>Time:</strong> {formatTime(task.start)} - {formatTime(task.end)}
              </div>
            </div>
          )}

          {task?.category && (
            <div className="task-detail-item">
              <FiTag className="detail-icon" />
              <div>
                <strong>Type:</strong> {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
              </div>
            </div>
          )}

          {/* Remove priority section */}

          {(task?.courseCode || task?.resource?.courseCode) && (
            <div className="task-detail-item">
              <FiBook className="detail-icon" />
              <div>
                <strong>Course:</strong> {task.courseCode || task.resource?.courseCode}
              </div>
            </div>
          )}

          {(task?.location || task?.resource?.location) && (
            <div className="task-detail-item">
              <FiMapPin className="detail-icon" />
              <div>
                <strong>Location:</strong> {task.location || task.resource?.location}
              </div>
            </div>
          )}

          {task?.description && (
            <div className="task-detail-item">
              <FiInfo className="detail-icon" />
              <div>
                <strong>Description:</strong>
                <p>{task.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
