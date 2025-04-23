import React from 'react';
import { FiClock, FiMapPin, FiBook } from 'react-icons/fi';
import { CalendarEvent } from '../types/types';
import '../styles/components/TaskEvent.css';

interface TaskEventComponentProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
}

const TaskEventComponent: React.FC<TaskEventComponentProps> = ({ event, onClick }) => {
  const priorityClass = event.priority ? `priority-${event.priority}` : 'priority-medium';
  const categoryClass = event.category ? `category-${event.category}` : '';
  const courseCodeClass = event.courseCode ? `course-code-${event.courseCode.replace(/\W+/g, '-').toLowerCase()}` : '';
  
  const isBreak = event.category === 'break';
  const isLongBreak = isBreak && event.resource?.isLongBreak;
  
  // Extract series information if it exists
  const seriesId = event.resource?.seriesId || event.resource?._id;
  const sessionNumber = event.resource?.sessionNumber;
  
  // Add course-specific color classes dynamically
  const courseCode = event.courseCode || event.resource?.courseCode;
  
  // Class names for styling
  const classNames = [
    'task-event',
    priorityClass,
    categoryClass,
    courseCodeClass,
    isBreak ? 'break-event' : '',
    isLongBreak ? 'long-break-event' : '',
    event.resource?.type ? `event-${event.resource.type}` : ''
  ].filter(Boolean).join(' ');
  
  // Format description for tooltip
  const tooltipTitle = `${event.title}${courseCode ? ` | ${courseCode}` : ''}${
    event.resource?.sessionNumber ? ` (Session ${event.resource.sessionNumber}/${event.resource.totalSessions})` : ''
  }`;
  
  // Get course code for data attribute
  const dataAttributes: Record<string, string> = {};
  
  if (courseCode) {
    dataAttributes['data-course-code'] = courseCode;
  }
  
  if (seriesId) {
    dataAttributes['data-series-id'] = seriesId.toString();
  }
  
  if (sessionNumber) {
    dataAttributes['data-session-number'] = sessionNumber.toString();
  }
  
  // Handle click event
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(event);
    }
  };
  
  return (
    <div 
      className={classNames}
      title={tooltipTitle}
      {...dataAttributes}
      onClick={handleClick}
    >
      <div className="task-event-title">
        {event.title}
        {sessionNumber && !isBreak && (
          <span className="event-series-marker" style={{ marginLeft: '4px' }}>{sessionNumber}</span>
        )}
      </div>
      
      {!isBreak && courseCode && (
        <div className="task-event-course">
          <FiBook className="task-event-icon" />
          <span>{courseCode}</span>
        </div>
      )}
      
      {!isBreak && event.location && (
        <div className="task-event-location">
          <FiMapPin className="task-event-icon" />
          <span>{event.location}</span>
        </div>
      )}
      
      {event.resource?.stage && !isBreak && (
        <div className="task-event-stage">
          <FiClock className="task-event-icon" />
          <span>{event.resource.stage}</span>
        </div>
      )}
    </div>
  );
};

export default TaskEventComponent;
