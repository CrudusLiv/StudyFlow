import React from 'react';
import { motion } from 'framer-motion';
import { 
  FiX, 
  FiCalendar, 
  FiClock, 
  FiMapPin, 
  FiBook, 
  FiTag, 
  FiUser,
  FiMessageSquare,
  FiCheckSquare,
  FiList,
  FiFile,
  FiBookOpen
} from 'react-icons/fi';
import '../styles/components/EventDetailsModal.css';
import { modalVariants, listVariants, listItemVariants } from '../utils/animationConfig';

interface EventDetailsModalProps {
  event: any;
  onClose: () => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const isClassEvent = event.category === 'class';
  const isStudyEvent = event.category === 'study';
  const isTopicEvent = event.category === 'topic-study';
  const isRevisionEvent = event.category === 'revision';
  const isPracticeEvent = event.category === 'practice';
  const isKnowledgeCheck = event.category === 'knowledge-check';
  const isMilestone = event.category === 'milestone';

  const getTypeName = () => {
    if (isClassEvent) return "Class";
    if (isStudyEvent) return "Study Session";
    if (isTopicEvent) return "Topic Study";
    if (isRevisionEvent) return "Revision";
    if (isPracticeEvent) return "Practice";
    if (isKnowledgeCheck) return "Knowledge Check";
    if (isMilestone) return "Milestone";
    return "Event";
  };

  return (
    <motion.div 
      className="event-modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="event-modal-content"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <button className="modal-close-button" onClick={onClose}>
          <FiX />
        </button>
        
        <div className="modal-header">
          <h2>{event.title}</h2>
          <div className="event-modal-type">{getTypeName()}</div>
        </div>
        
        <motion.div 
          className="modal-section"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="modal-info-grid"
            variants={listVariants}
          >
            <motion.div 
              className="info-item"
              variants={listItemVariants}
            >
              <FiCalendar className="info-icon" />
              <div>
                <div className="info-label">Date</div>
                <div className="info-value">
                  {new Date(event.start).toLocaleDateString([], {
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric'
                  })}
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="info-item"
              variants={listItemVariants}
            >
              <FiClock className="info-icon" />
              <div>
                <div className="info-label">Time</div>
                <div className="info-value">
                  {new Date(event.start).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(event.end).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </motion.div>
            
            {(event.courseCode || event.resource?.courseCode) && (
              <motion.div 
                className="info-item"
                variants={listItemVariants}
              >
                <FiBook className="info-icon" />
                <div>
                  <div className="info-label">Course</div>
                  <div className="info-value">
                    {event.courseCode || event.resource?.courseCode}
                  </div>
                </div>
              </motion.div>
            )}
            
            {(event.location || event.resource?.location) && (
              <motion.div 
                className="info-item"
                variants={listItemVariants}
              >
                <FiMapPin className="info-icon" />
                <div>
                  <div className="info-label">Location</div>
                  <div className="info-value">
                    {event.location || event.resource?.location}
                  </div>
                </div>
              </motion.div>
            )}
            
            {event.category && (
              <motion.div 
                className="info-item"
                variants={listItemVariants}
              >
                <FiTag className="info-icon" />
                <div>
                  <div className="info-label">Category</div>
                  <div className="info-value">
                    {event.category.charAt(0).toUpperCase() + event.category.slice(1).replace('-', ' ')}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
        
        {/* Description section */}
        {event.description && (
          <motion.div 
            className="modal-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3>Description</h3>
            <div className="description-content">
              {event.description}
            </div>
          </motion.div>
        )}
        
        {/* Study session specific details */}
        {isStudyEvent && event.resource && (
          <motion.div 
            className="modal-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3>Study Session Details</h3>
            
            <motion.div
              className="detail-items"
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="detail-item" variants={listItemVariants}>
                <FiUser className="detail-icon" />
                <div className="detail-content">
                  <div className="detail-label">Session</div>
                  <div className="detail-value">
                    {event.resource.name || 'Study Session'}
                    {event.resource.sessionNumber && (
                      <span className="session-number">
                        {' '}(Session {event.resource.sessionNumber} of {event.resource.totalSessions})
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
              
              <motion.div className="detail-item" variants={listItemVariants}>
                <FiFile className="detail-icon" />
                <div className="detail-content">
                  <div className="detail-label">Assignment</div>
                  <div className="detail-value">{event.resource.originalEvent.title}</div>
                </div>
              </motion.div>
              
              {event.description && (
                <motion.div className="detail-item" variants={listItemVariants}>
                  <FiMessageSquare className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Study Focus</div>
                    <div className="detail-value">{event.description}</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
        
        {/* Topic study specific details */}
        {isTopicEvent && event.resource?.topic && (
          <motion.div 
            className="modal-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3>Topic Details</h3>
            
            <motion.div
              className="detail-items"
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="detail-item" variants={listItemVariants}>
                <FiBookOpen className="detail-icon" />
                <div className="detail-content">
                  <div className="detail-label">Topic</div>
                  <div className="detail-value">{event.resource.topic}</div>
                </div>
              </motion.div>
              
              {event.resource.relatedAssignment && (
                <motion.div className="detail-item" variants={listItemVariants}>
                  <FiFile className="detail-icon" />
                  <div className="detail-content">
                    <div className="detail-label">Related Assignment</div>
                    <div className="detail-value">{event.resource.relatedAssignment}</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
        
        {/* Milestone specific details */}
        {isMilestone && event.resource?.checklistItems && (
          <motion.div 
            className="modal-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3>Milestone Checklist</h3>
            <motion.div 
              className="checklist-container"
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {event.resource.checklistItems.map((item: string, index: number) => (
                <motion.div 
                  key={index} 
                  className="checklist-item"
                  variants={listItemVariants}
                >
                  <FiCheckSquare className="checklist-icon" />
                  <div className="checklist-text">{item}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
        
        {/* Knowledge check specific details */}
        {isKnowledgeCheck && event.resource?.questions && (
          <motion.div 
            className="modal-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3>Knowledge Check Questions</h3>
            <motion.div 
              className="questions-container"
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {event.resource.questions.map((question: string, index: number) => (
                <motion.div 
                  key={index} 
                  className="question-item"
                  variants={listItemVariants}
                >
                  <div className="question-number">{index + 1}</div>
                  <div className="question-text">{question}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
        
        <motion.div 
          className="modal-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button onClick={onClose} className="modal-button secondary">Close</button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default EventDetailsModal;
