import React from 'react';
import { 
  FiBookOpen, 
  FiClock, 
  FiClipboard, 
  FiEdit3, 
  FiFileText, 
  FiCheckSquare,
  FiAward,
  FiLayers,
  FiBook,
  FiMapPin,
  FiCalendar,
  FiTag,
  FiFlag
} from 'react-icons/fi';
import '../styles/components/EventCard.css';

interface EventCardProps {
  event: any;
  onViewDetails?: (event: any) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onViewDetails }) => {
  if (!event) return null;

  // Determine event type and customize display
  const isClassEvent = event.resource?.type === 'class';
  const isStudyEvent = event.category === 'study';
  const isTopicEvent = event.category === 'topic-study';
  const isRevisionEvent = event.category === 'revision';
  const isPracticeEvent = event.category === 'practice';
  const isKnowledgeCheck = event.category === 'knowledge-check';
  const isMilestone = event.category === 'milestone';
  
  // Format date and time
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Get icon based on event type
  const getEventIcon = () => {
    if (isClassEvent) return <FiBookOpen className="event-type-icon class" />;
    if (isStudyEvent) return <FiEdit3 className="event-type-icon study" />;
    if (isTopicEvent) return <FiBook className="event-type-icon topic" />;
    if (isRevisionEvent) return <FiLayers className="event-type-icon revision" />;
    if (isPracticeEvent) return <FiCheckSquare className="event-type-icon practice" />;
    if (isKnowledgeCheck) return <FiAward className="event-type-icon check" />;
    if (isMilestone) return <FiFlag className="event-type-icon milestone" />;
    
    return <FiClipboard className="event-type-icon default" />;
  };
  
  // Get priority class name
  const getPriorityClass = () => {
    switch (event.priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };
  
  // Get event category class name
  const getCategoryClass = () => {
    return `category-${event.category || 'default'}`;
  };
  
  // Handle click
  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(event);
    }
  };

  return (
    <div 
      className={`event-card ${getPriorityClass()} ${getCategoryClass()}`}
      onClick={handleCardClick}
    >
      <div className="event-card-header">
        {getEventIcon()}
        <h3 className="event-title">{event.title}</h3>
        {event.priority && (
          <div className={`priority-badge ${getPriorityClass()}`}>
            {event.priority}
          </div>
        )}
      </div>
      
      <div className="event-card-content">
        <div className="event-time-location">
          <div className="event-time">
            <FiClock className="icon" />
            <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
          </div>
          
          <div className="event-date">
            <FiCalendar className="icon" />
            <span>{formatDate(event.start)}</span>
          </div>
          
          {event.courseCode && (
            <div className="event-course">
              <FiTag className="icon" />
              <span>{event.courseCode}</span>
            </div>
          )}
          
          {(event.location || event.resource?.location) && (
            <div className="event-location">
              <FiMapPin className="icon" />
              <span>{event.location || event.resource?.location}</span>
            </div>
          )}
        </div>
        
        {event.description && (
          <div className="event-description">
            <p>{event.description}</p>
          </div>
        )}
        
        {/* Show additional details based on event type */}
        {isStudyEvent && event.resource?.originalEvent && (
          <div className="event-detail">
            <FiFileText className="icon" />
            <span>Assignment: {event.resource.originalEvent.title}</span>
          </div>
        )}
        
        {isKnowledgeCheck && event.resource?.questions && (
          <div className="event-questions">
            <strong>Topics to review:</strong>
            <ul>
              {event.resource.questions.map((q, i) => (
                <li key={i}>{q.questionText}</li>
              ))}
            </ul>
          </div>
        )}
        
        {isMilestone && event.resource?.checklistItems && (
          <div className="event-checklist">
            <strong>Checklist:</strong>
            <ul>
              {event.resource.checklistItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="event-card-actions">
        <button className="action-button details-button" onClick={handleCardClick}>
          View Details
        </button>
      </div>
    </div>
  );
};

export default EventCard;
