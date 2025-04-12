import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCalendar, FiClock, FiBookOpen, FiFileText, FiList, FiPackage, FiInfo } from 'react-icons/fi';
import '../styles/components/TaskModal.css';

interface TaskModalProps {
  event: any;
  onClose: () => void;
  onUpdate?: (updatedTask: any) => void;
  onDelete?: () => void;
  isOpen: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({ event, onClose, onUpdate, onDelete, isOpen }) => {
  // Log the entire event object to debug what data is available
  console.log('TaskModal received event:', event);

  const [status, setStatus] = useState(event?.status || 'pending');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    status: event?.status || 'pending'
  });

  useEffect(() => {
    // Add detailed logging for debugging
    console.log('TaskModal received event details:', {
      title: event?.title,
      category: event?.category,
      hasResource: !!event?.resource,
      resourceType: event?.resource?.type,
      hasTaskDetails: !!(event?.resource?.taskDetails),
      tasks: event?.resource?.taskDetails?.tasks?.length || 0,
      deliverables: event?.resource?.taskDetails?.deliverables?.length || 0,
      hasPdfDetails: !!(event?.resource?.pdfDetails),
      sourceFile: event?.resource?.pdfDetails?.fileName || 'none'
    });

    // Update status when event changes
    if (event && event.status) {
      setStatus(event.status);
    }
  }, [event]);

  // Extract task details from the event resource with multiple fallback paths
  const resource = event?.resource || {};
  
  // Extract different components with fallbacks to avoid "undefined" displays
  
  // Task title with multiple fallback options
  const taskTitle = event?.title || 
                    resource?.title || 
                    resource?.assignmentTitle || 
                    'Untitled Task';
  
  // Task description with multiple fallback paths
  const description = event?.description || 
                      resource?.description || 
                      resource?.details?.description || 
                      resource?.pdfDetails?.extractedText?.substring(0, 200) || 
                      'No description provided';
  
  // Get task details with proper fallbacks
  const taskDetails = resource?.taskDetails || {};
  const tasks = taskDetails?.tasks || [];
  const deliverables = taskDetails?.deliverables || [];
  const stageGuidance = taskDetails?.stageGuidance || 
                        resource?.stage || 
                        resource?.details?.guidance || 
                        '';
  
  // Extract source document information with fallbacks
  const pdfDetails = resource?.pdfDetails || {};
  const sourceFile = pdfDetails?.fileName || 
                    resource?.sourceFile || 
                    resource?.sourceDetails?.fileName || 
                    'Unknown source';
  
  // Extract assignment details with fallbacks
  const assignmentTitle = resource?.assignmentTitle || 
                          event?.title?.replace(/Study session for\s*/i, '') || 
                          taskTitle;
  
  const stage = resource?.stage || '';
  const complexity = resource?.details?.complexity || 
                    resource?.complexity || 
                    event?.complexity?.overall || 
                    3;
  
  const courseCode = resource?.courseCode || 
                     event?.courseCode || 
                     resource?.details?.courseCode || 
                     '';

  // Format the date for display with robust error handling
  const formatDate = (date: any) => {
    if (!date) return 'No date provided';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if date is valid before formatting
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date provided:', date);
        return 'Invalid date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  // Calculate duration with robust error handling
  const calculateDuration = () => {
    try {
      if (!event?.start || !event?.end) {
        return 'Duration not specified';
      }
      
      const start = event.start instanceof Date ? event.start : new Date(event.start);
      const end = event.end instanceof Date ? event.end : new Date(event.end);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Invalid date range';
      }
      
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      if (durationMinutes < 0) {
        return 'Invalid duration';
      } else if (durationMinutes < 60) {
        return `${durationMinutes} minutes`;
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        return `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
      }
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 'Duration error';
    }
  };

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (onUpdate) {
      onUpdate({
        ...event,
        status: newStatus
      });
    }
  };

  // Modal animation variants
  const modalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  // Generate complexity stars
  const renderComplexityStars = (level: number) => {
    const stars = [];
    const maxStars = 5;
    const normalizedLevel = typeof level === 'number' ? 
                           Math.max(1, Math.min(5, Math.round(level))) : 
                           3; // Default to 3 stars if invalid
    
    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <span key={i} className={i <= normalizedLevel ? 'star filled' : 'star'}>★</span>
      );
    }
    
    return <div className="complexity-stars">{stars}</div>;
  };

  // Extract array of text content with fallbacks
  const getTextArray = (items: any) => {
    if (!items) return [];
    
    if (Array.isArray(items)) {
      return items.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          return item.task || item.deliverable || item.content || JSON.stringify(item);
        }
        return String(item);
      }).filter(Boolean);
    }
    
    if (typeof items === 'string') {
      return items.split(/[.,;]/).filter(item => item.trim().length > 0);
    }
    
    return [];
  };

  const taskArray = getTextArray(tasks);
  const deliverableArray = getTextArray(deliverables);

  // Get extracted text preview with proper handling
  const getExtractedTextPreview = () => {
    const text = pdfDetails?.extractedText || resource?.extractedContent || '';
    if (!text) return '';
    
    const maxLength = 300;
    return text.length > maxLength ? 
           `${text.substring(0, maxLength)}...` : 
           text;
  };

  return (
    <motion.div
      className="task-modal"
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="task-modal-content">
        <div className="task-modal-header">
          <div className="task-modal-title-area">
            <h2>{taskTitle}</h2>
            {courseCode && <div className="task-course-code">{courseCode}</div>}
          </div>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="task-modal-body">
          <div className="task-details-section">
            <div className="task-metadata">
              <div className="metadata-item">
                <FiCalendar className="metadata-icon" />
                <span>{formatDate(event?.start)}</span>
              </div>
              <div className="metadata-item">
                <FiClock className="metadata-icon" />
                <span>{calculateDuration()}</span>
              </div>
              {complexity !== undefined && (
                <div className="metadata-item">
                  <span className="complexity-label">Complexity:</span>
                  {renderComplexityStars(complexity)}
                </div>
              )}
            </div>

            <div className="task-description">
              <p>{description}</p>
            </div>

            {stage && (
              <div className="task-stage">
                <h3>Current Stage: {stage}</h3>
                {stageGuidance && <p className="stage-guidance">{stageGuidance}</p>}
              </div>
            )}

            {taskArray.length > 0 && (
              <div className="task-section">
                <h3 className="section-title"><FiList className="section-icon" /> Tasks</h3>
                <ul className="tasks-list">
                  {taskArray.map((task, index) => (
                    <li key={`task-${index}`} className="task-item">{task}</li>
                  ))}
                </ul>
              </div>
            )}

            {deliverableArray.length > 0 && (
              <div className="task-section">
                <h3 className="section-title"><FiPackage className="section-icon" /> Deliverables</h3>
                <ul className="deliverables-list">
                  {deliverableArray.map((deliverable, index) => (
                    <li key={`deliverable-${index}`} className="deliverable-item">{deliverable}</li>
                  ))}
                </ul>
              </div>
            )}

            {sourceFile && (
              <div className="task-section source-section">
                <h3 className="section-title"><FiFileText className="section-icon" /> Source</h3>
                <p className="source-file">{sourceFile}</p>
                {getExtractedTextPreview() && (
                  <div className="source-preview">
                    <h4>Document Preview</h4>
                    <div className="extracted-text">
                      {getExtractedTextPreview()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="task-status-section">
              <h3 className="section-title"><FiInfo className="section-icon" /> Status</h3>
              <div className="status-buttons">
                <button 
                  className={`status-button ${status === 'pending' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('pending')}
                >
                  Pending
                </button>
                <button 
                  className={`status-button ${status === 'in-progress' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('in-progress')}
                >
                  In Progress
                </button>
                <button 
                  className={`status-button ${status === 'completed' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('completed')}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="task-modal-footer">
          <div className="task-actions">
            <button className="task-action-button secondary" onClick={onClose}>
              Close
            </button>
            {onDelete && (
              <button className="task-action-button danger" onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TaskModal;
