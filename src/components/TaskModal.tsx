import React from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent } from '../types/types';
import { FiClock, FiCalendar, FiBook, FiTag, FiInfo, FiMapPin } from 'react-icons/fi';
import { modalVariants } from '../utils/animationConfig';

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
    <motion.div 
      className="modal-overlay" 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="modal-content task-modal"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="modal-header">
          <h2>{task?.title || 'Untitled Event'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <motion.div 
          className="task-details"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {task?.start && (
            <motion.div 
              className="task-detail-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <FiCalendar className="detail-icon" />
              <div>
                <strong>Date:</strong> {formatDate(task.start)}
              </div>
            </motion.div>
          )}

          {task?.start && task?.end && (
            <motion.div 
              className="task-detail-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <FiClock className="detail-icon" />
              <div>
                <strong>Time:</strong> {formatTime(task.start)} - {formatTime(task.end)}
              </div>
            </motion.div>
          )}

          {task?.category && (
            <motion.div 
              className="task-detail-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <FiTag className="detail-icon" />
              <div>
                <strong>Type:</strong> {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
              </div>
            </motion.div>
          )}

          {(task?.courseCode || task?.resource?.courseCode) && (
            <motion.div 
              className="task-detail-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <FiBook className="detail-icon" />
              <div>
                <strong>Course:</strong> {task.courseCode || task.resource?.courseCode}
              </div>
            </motion.div>
          )}

          {(task?.location || task?.resource?.location) && (
            <motion.div 
              className="task-detail-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <FiMapPin className="detail-icon" />
              <div>
                <strong>Location:</strong> {task.location || task.resource?.location}
              </div>
            </motion.div>
          )}

          {task?.description && (
            <motion.div 
              className="task-detail-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <FiInfo className="detail-icon" />
              <div>
                <strong>Description:</strong>
                <p>{task.description}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default TaskModal;
