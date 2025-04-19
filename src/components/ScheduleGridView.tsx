import React from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent } from '../types/types';
import { FiClock, FiMapPin, FiBook } from 'react-icons/fi';

interface ScheduleGridViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const ScheduleGridView: React.FC<ScheduleGridViewProps> = ({ events, onEventClick }) => {
  // Group events by day
  const groupEventsByDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const groupedEvents: { [key: string]: CalendarEvent[] } = {};
    
    // Initialize empty arrays for each day
    days.forEach(day => {
      groupedEvents[day] = [];
    });
    
    // Group events by day of the week
    events.forEach(event => {
      const eventDate = new Date(event.start);
      if (!isNaN(eventDate.getTime())) {
        const dayOfWeek = eventDate.getDay();
        const dayName = days[dayOfWeek];
        groupedEvents[dayName].push(event);
      }
    });
    
    return groupedEvents;
  };

  const formatTime = (date: Date | string) => {
    // Make sure date is a valid Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid before calling toLocaleTimeString
    if (isNaN(dateObj.getTime())) {
      return "Invalid time";
    }
    
    return dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const groupedEvents = groupEventsByDay();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <motion.div 
      className="schedule-grid-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="schedule-grid">
        {days.map(day => (
          <div key={day} className="day-column">
            <div className="day-header">
              <h3>{day}</h3>
              <p>{groupedEvents[day]?.length || 0} events</p>
            </div>
            <div className="day-events">
              {groupedEvents[day]?.length > 0 ? (
                groupedEvents[day].map((event, index) => (
                  <motion.div 
                    key={event.id || `${day}-event-${index}`}
                    className={`grid-class-item ${event.category === 'class' ? 'class-event' : 'task-event'}`}
                    whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="grid-event-time">
                      <FiClock />
                      <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
                    </div>
                    <h4 className="grid-event-title">{event.title}</h4>
                    {(event.location || event.resource?.location) && (
                      <div className="grid-event-location">
                        <FiMapPin />
                        <span>{event.location || event.resource?.location}</span>
                      </div>
                    )}
                    {(event.courseCode || event.resource?.courseCode) && (
                      <div className="grid-event-course">
                        <FiBook />
                        <span>{event.courseCode || event.resource?.courseCode}</span>
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div key={`${day}-no-events`} className="no-events">No events</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ScheduleGridView;
