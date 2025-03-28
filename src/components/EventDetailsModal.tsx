import React from 'react';
import {
  FiBookOpen,
  FiClock,
  FiCalendar,
  FiX,
  FiMapPin,
  FiTag,
  FiCheckSquare,
  FiUser,
  FiMessageSquare,
  FiFile,
  FiTarget
} from 'react-icons/fi';
import '../styles/components/EventDetailsModal.css';

interface EventDetailsModalProps {
  event: any;
  onClose: () => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  // Format date properly
  const formatDateTime = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get event type information
  const isClassEvent = event.resource?.type === 'class';
  const isStudyEvent = event.category === 'study';
  const isTopicEvent = event.category === 'topic-study';
  const isRevisionEvent = event.category === 'revision';
  const isPracticeEvent = event.category === 'practice';
  const isKnowledgeCheck = event.category === 'knowledge-check';
  const isMilestone = event.category === 'milestone';
  
  // Get formatted type name
  const getTypeName = () => {
    if (isClassEvent) return 'Class Session';
    if (isStudyEvent) return 'Study Session';
    if (isTopicEvent) return 'Topic Study';
    if (isRevisionEvent) return 'Revision Session';
    if (isPracticeEvent) return 'Practice Session';
    if (isKnowledgeCheck) return 'Knowledge Check';
    if (isMilestone) return 'Project Milestone';
    return 'Event';
  };

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          <FiX />
        </button>
        
        <div className="modal-header">
          <h2>{event.title}</h2>
          <div className="event-modal-type">{getTypeName()}</div>
        </div>
        
        <div className="modal-section">
          <div className="modal-info-grid">
            <div className="info-item">
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
            </div>
            
            <div className="info-item">
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
            </div>
            
            {event.courseCode && (
              <div className="info-item">
                <FiTag className="info-icon" />
                <div>
                  <div className="info-label">Course</div>
                  <div className="info-value">{event.courseCode}</div>
                </div>
              </div>
            )}
            
            {(event.location || event.resource?.location) && (
              <div className="info-item">
                <FiMapPin className="info-icon" />
                <div>
                  <div className="info-label">Location</div>
                  <div className="info-value">{event.location || event.resource?.location}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Class specific details */}
        {isClassEvent && event.resource?.details && (
          <div className="modal-section">
            <h3>Class Details</h3>
            {event.resource.details.courseName && (
              <div className="detail-item">
                <FiBookOpen className="detail-icon" />
                <div className="detail-content">
                  <div className="detail-label">Course Name</div>
                  <div className="detail-value">{event.resource.details.courseName}</div>
                </div>
              </div>
            )}
            
            {event.resource.details.professor && (
              <div className="detail-item">
                <FiUser className="detail-icon" />
                <div className="detail-content">
                  <div className="detail-label">Professor</div>
                  <div className="detail-value">{event.resource.details.professor}</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Study session details */}
        {isStudyEvent && event.resource?.originalEvent && (
          <div className="modal-section">
            <h3>Study Details</h3>
            
            <div className="detail-item">
              <FiTarget className="detail-icon" />
              <div className="detail-content">
                <div className="detail-label">Session Type</div>
                <div className="detail-value">
                  {event.resource.stage || 'Study Session'}
                  {event.resource.sessionNumber && event.resource.totalSessions && (
                    <span className="session-count">
                      {' '}(Session {event.resource.sessionNumber} of {event.resource.totalSessions})
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="detail-item">
              <FiFile className="detail-icon" />
              <div className="detail-content">
                <div className="detail-label">Assignment</div>
                <div className="detail-value">{event.resource.originalEvent.title}</div>
              </div>
            </div>
            
            {event.description && (
              <div className="detail-item">
                <FiMessageSquare className="detail-icon" />
                <div className="detail-content">
                  <div className="detail-label">Study Focus</div>
                  <div className="detail-value">{event.description}</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Topic study specific details */}
        {isTopicEvent && event.resource?.topic && (
          <div className="modal-section">
            <h3>Topic Details</h3>
            
            <div className="detail-item">
              <FiBookOpen className="detail-icon" />
              <div className="detail-content">
                <div className="detail-label">Topic</div>
                <div className="detail-value">{event.resource.topic}</div>
              </div>
            </div>
            
            {event.resource.relatedAssignment && (
              <div className="detail-item">
                <FiFile className="detail-icon" />
                <div className="detail-content">
                  <div className="detail-label">Related Assignment</div>
                  <div className="detail-value">{event.resource.relatedAssignment}</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Milestone specific details */}
        {isMilestone && event.resource?.checklistItems && (
          <div className="modal-section">
            <h3>Milestone Checklist</h3>
            <div className="checklist-container">
              {event.resource.checklistItems.map((item, index) => (
                <div key={index} className="checklist-item">
                  <FiCheckSquare className="checklist-icon" />
                  <div className="checklist-text">{item}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Knowledge check details */}
        {isKnowledgeCheck && event.resource?.questions && (
          <div className="modal-section">
            <h3>Knowledge Check Topics</h3>
            <div className="checklist-container">
              {event.resource.questions.map((question, index) => (
                <div key={index} className="question-item">
                  <div className="question-number">{index + 1}</div>
                  <div className="question-text">{question.questionText}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="modal-actions">
          <button className="modal-button primary" onClick={onClose}>Close</button>
          {!isClassEvent && (
            <button className="modal-button secondary">Mark Complete</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
