import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent } from '../types/types';
import { 
  FiClock, 
  FiCalendar, 
  FiBook, 
  FiTag, 
  FiInfo, 
  FiMapPin, 
  FiList, 
  FiTarget, 
  FiCheckSquare, 
  FiFile, 
  FiFileText,
  FiChevronDown,
  FiChevronRight,
  FiLink,
  FiExternalLink
} from 'react-icons/fi';
import { modalVariants } from '../utils/animationConfig';
import { scheduleService } from '../services/scheduleService';

interface TaskModalProps {
  task: CalendarEvent;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  const [showFullText, setShowFullText] = useState(false);
  const [activeTab, setActiveTab] = useState<'guidance' | 'details' | 'source'>('guidance');
  
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
  
  // Generate a better title for the task
  const getEnhancedTitle = () => {
    // If title isn't "Untitled Assignment", use it
    if (task?.title && !task.title.includes("Untitled")) {
      return task.title;
    }
    
    // Use extractSimpleAssignmentTitle from scheduleService to get a better title
    const courseCode = task?.courseCode || task?.resource?.courseCode;
    const enhancedTitle = scheduleService.extractSimpleAssignmentTitle(task, courseCode);
    
    // If we got a good title from the service, use it
    if (enhancedTitle && !enhancedTitle.includes("Untitled")) {
      return enhancedTitle;
    }
    
    // Try to extract assignment number from file name if available
    if (task?.resource?.sourceDetails?.fileName || task?.resource?.sourceFile) {
      const fileName = task.resource.sourceDetails?.fileName || task.resource.sourceFile;
      const assignmentMatch = fileName?.match(/assignment[_\s]*(\d+)/i) || 
                             fileName?.match(/a(\d+)[_\.]/i) ||
                             fileName?.match(/(\d+)[_\s]*assignment/i);
      
      if (assignmentMatch && assignmentMatch[1]) {
        return courseCode 
          ? `${courseCode} - Assignment ${assignmentMatch[1]}`
          : `Assignment ${assignmentMatch[1]}`;
      }
    }
    
    // Try to extract assignment number from extracted text if available
    if (task?.resource?.extractedText) {
      const assignmentNoMatch = task.resource.extractedText.match(/Assignment\s*No\s*:\s*(\d+)/i);
      if (assignmentNoMatch && assignmentNoMatch[1]) {
        return courseCode 
          ? `${courseCode} - Assignment ${assignmentNoMatch[1]}`
          : `Assignment ${assignmentNoMatch[1]}`;
      }
    }
    
    // Final fallback
    return courseCode ? `${courseCode} Assignment` : 'Assignment';
  };

  // Get stage-specific guidance from the task resource
  const stageGuidance = task?.resource?.taskDetails?.stageGuidance || [];
  const tasks = task?.resource?.taskDetails?.tasks || [];
  const deliverables = task?.resource?.taskDetails?.deliverables || [];
  
  // Additional data sources - check multiple locations where tasks might be stored
  const allTasks = tasks.length > 0 ? tasks : 
    (task?.resource?.requirements || 
     task?.resource?.assignmentData?.requirements || 
     []);
  
  const allDeliverables = deliverables.length > 0 ? deliverables : 
    (task?.resource?.deliverables || 
     task?.resource?.assignmentData?.deliverables || 
     []);
  
  // Log for debugging
  console.log('Task data available in modal:', {
    hasTasks: allTasks.length > 0,
    hasDeliverables: allDeliverables.length > 0,
    tasksCount: allTasks.length,
    deliverablesCount: allDeliverables.length,
    stageGuidanceCount: stageGuidance.length,
    resource: task?.resource
  });
  
  // Get the current stage and session info
  const currentStage = task?.resource?.stage || '';
  const sessionNumber = task?.resource?.sessionNumber || 0;
  const totalSessions = task?.resource?.totalSessions || 0;
  
  // Get extracted text (with proper fallback)
  const extractedText = task?.pdfDetails?.extractedText || 'No text extracted';
  
  // Determine if this is a study session task
  const isStudySession = task?.category === 'study' || task?.type === 'study-session';
  
  // Determine due date (if available)
  const dueDate = task?.resource?.dueDate ? new Date(task?.resource?.dueDate) : null;
  const dueDateStr = dueDate ? formatDate(dueDate) : 'Not specified';
  
  // Function to render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'guidance':
        return (
          <motion.div 
            className="task-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {isStudySession && (
              <>
                <h3 className="task-section-title">
                  <FiTarget className="section-icon" /> Session Guidance
                </h3>
                <div className="session-info">
                  <div className="session-header">
                    <span className="stage-label">{currentStage}</span>
                    <span className="session-progress">Session {sessionNumber} of {totalSessions}</span>
                  </div>
                  
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(sessionNumber / totalSessions) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="task-guidance">
                  <h4>What to do in this session:</h4>
                  <ul className="guidance-list">
                    {stageGuidance.length > 0 ? (
                      stageGuidance.map((guidanceItem, index) => (
                        <li key={index} className="guidance-item">
                          <FiCheckSquare className="guidance-icon" />
                          <span>{guidanceItem}</span>
                        </li>
                      ))
                    ) : (
                      <li className="guidance-item">
                        <FiCheckSquare className="guidance-icon" />
                        <span>Review the assignment requirements and work on your assigned tasks.</span>
                      </li>
                    )}
                  </ul>
                </div>
                
                {dueDateStr && (
                  <div className="due-date-reminder">
                    <FiCalendar className="due-date-icon" />
                    <span>Due date: {dueDateStr}</span>
                  </div>
                )}
              </>
            )}
            
            {!isStudySession && (
              <div className="event-details">
                <p className="event-description">{task.description || 'No description available.'}</p>
              </div>
            )}
          </motion.div>
        );
        
      case 'details':
        return (
          <motion.div 
            className="task-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="task-section-title">
              <FiList className="section-icon" /> Assignment Details
            </h3>
            
            {allTasks.length > 0 && (
              <div className="assignment-section">
                <h4><FiCheckSquare /> Tasks</h4>
                <ul className="assignment-list">
                  {allTasks.map((task, index) => (
                    <li key={index} className="assignment-item">{task}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {allDeliverables.length > 0 && (
              <div className="assignment-section">
                <h4><FiFileText /> Deliverables</h4>
                <ul className="assignment-list">
                  {allDeliverables.map((deliverable, index) => (
                    <li key={index} className="assignment-item">{deliverable}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {allTasks.length === 0 && allDeliverables.length === 0 && task?.description && (
              <div className="assignment-section">
                <h4><FiInfo /> Description</h4>
                <p className="task-description">{task.description}</p>
              </div>
            )}
            
            {allTasks.length === 0 && allDeliverables.length === 0 && !task?.description && (
              <div className="fallback-extraction">
                <p className="no-details-message">No detailed task information available.</p>
                <button 
                  className="try-extraction-button"
                  onClick={() => setActiveTab('source')}
                >
                  View Document Source
                </button>
              </div>
            )}
          </motion.div>
        );
        
      default:
        return null;
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
          <h2>{getEnhancedTitle()}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <motion.div 
          className="task-details"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="task-info-grid">
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
          </div>
          
          {isStudySession && (
            <div className="task-tabs">
              <button 
                className={`tab-button ${activeTab === 'guidance' ? 'active' : ''}`}
                onClick={() => setActiveTab('guidance')}
              >
                Guidance
              </button>
              <button 
                className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Assignment Details
              </button>
            </div>
          )}
          
          {renderTabContent()}
        </motion.div>

        {/* Task details */}
        <div className="task-details">
          {/* ...existing code... */}
        </div>
        
        {/* Resources section - Keep this if it's still useful */}
        {task.resource?.resources && task.resource.resources.length > 0 && (
          <div className="resources-section">
            <h3 className="section-header">
              <FiLink className="section-icon" /> Resources
            </h3>
            <div className="resources-list">
              {task.resource.resources.map((resource, index) => (
                <a key={index} href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                  <FiExternalLink className="resource-icon" />
                  {resource.title || resource.url}
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Source Document section removed */}
        
        {/* Task actions */}
        <div className="task-actions">
          {/* ...existing code... */}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TaskModal;
