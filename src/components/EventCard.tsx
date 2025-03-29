import React from 'react';
import { motion } from 'framer-motion';
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
import { gridItemVariants } from '../utils/animationConfig';

interface EventCardProps {
  event: any;
  onViewDetails: (event: any) => void;
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
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get icon based on event type
  const getEventIcon = () => {
    if (isClassEvent) return <FiBookOpen className="event-icon class" />;
    if (isStudyEvent) return <FiBook className="event-icon study" />;
    if (isTopicEvent) return <FiLayers className="event-icon topic" />;
    if (isRevisionEvent) return <FiEdit3 className="event-icon revision" />;
    if (isPracticeEvent) return <FiClipboard className="event-icon practice" />;
    if (isKnowledgeCheck) return <FiCheckSquare className="event-icon knowledge-check" />;
    if (isMilestone) return <FiFlag className="event-icon milestone" />;
    return <FiFileText className="event-icon" />;
  };

  // Get event type name for display
  const getEventTypeName = () => {
    if (isClassEvent) return "Class";
    if (isStudyEvent) return "Study Session";
    if (isTopicEvent) return "Topic Study";
    if (isRevisionEvent) return "Revision";
    if (isPracticeEvent) return "Practice";
    if (isKnowledgeCheck) return "Knowledge Check";
    if (isMilestone) return "Milestone";
    return "Task";
  };

  return (
    <motion.div 
      className="event-card"
      onClick={() => onViewDetails(event)}
      variants={gridItemVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <div className="event-header">
        {getEventIcon()}
        <div className="event-title-section">
          <h3 className="event-title">{event.title}</h3>
          <span className="event-type">{getEventTypeName()}</span>
        </div>
      </div>
      
      <div className="event-details">
        {event.start && (
          <div className="event-date">
            <FiCalendar className="icon" />
            {formatDate(event.start)}
          </div>
        )}
        
        {event.start && event.end && (
          <div className="event-time">
            <FiClock className="icon" />
            {formatTime(event.start)} - {formatTime(event.end)}
          </div>
        )}
        
        {event.courseCode && (
          <div className="event-course">
            <FiBook className="icon" />
            {event.courseCode}
          </div>
        )}
        
        {event.location && (
          <div className="event-location">
            <FiMapPin className="icon" />
            {event.location}
          </div>
        )}
      </div>
      
      {event.description && (
        <div className="event-description">
          <p>{event.description}</p>
        </div>
      )}
      
      <motion.div 
        className="event-footer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.button className="view-details-button">
          View Details
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default EventCard;
