import React from 'react';
import { CalendarEvent } from '../types/types';

interface TaskEventProps {
  event: CalendarEvent;
}

const TaskEventComponent: React.FC<TaskEventProps> = ({ event }) => {
  // Remove priority class references
  const categoryClass = event.category || '';
  const isClassEvent = event.category === 'class';
  const courseCode = event.courseCode || event.resource?.courseCode;

  return (
    <div className={`task-event ${categoryClass}`}>
      <div className="task-event-title">
        {isClassEvent && courseCode ? `${courseCode} - ` : ''}{event.title}
      </div>
      {event.description && (
        <div className="task-event-desc">{event.description}</div>
      )}
      {courseCode && !isClassEvent && (
        <div className="task-event-course">{courseCode}</div>
      )}
      {isClassEvent && event.resource?.location && (
        <div className="task-event-location">📍 {event.resource.location}</div>
      )}
    </div>
  );
};

export default TaskEventComponent;
