import React from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent } from '../types/types';
import { FiClock, FiMapPin, FiBook, FiCalendar } from 'react-icons/fi';

interface ScheduleListViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const ScheduleListView: React.FC<ScheduleListViewProps> = ({ events, onEventClick }) => {
  // Ensure date is a proper Date object
  const ensureDate = (date: Date | string): Date => {
    if (date instanceof Date) {
      return date;
    }
    const dateObj = new Date(date);
    return isNaN(dateObj.getTime()) ? new Date() : dateObj;
  };

  // Group events by date
  const groupEventsByDate = () => {
    const groupedEvents: { [key: string]: CalendarEvent[] } = {};
    
    // Filter out events with invalid dates and sort events by date
    const validEvents = events.filter(event => {
      const startDate = event.start instanceof Date ? event.start : new Date(event.start);
      return !isNaN(startDate.getTime());
    });

    const sortedEvents = [...validEvents].sort((a, b) => {
      const aStart = ensureDate(a.start);
      const bStart = ensureDate(b.start);
      return aStart.getTime() - bStart.getTime();
    });
    
    // Group events by date string
    sortedEvents.forEach(event => {
      const startDate = ensureDate(event.start);
      const dateStr = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groupedEvents[dateStr]) {
        groupedEvents[dateStr] = [];
      }
      
      groupedEvents[dateStr].push(event);
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

  const groupedEvents = groupEventsByDate();
  const dates = Object.keys(groupedEvents);

  return (
    <motion.div 
      className="schedule-list-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {dates.length > 0 ? (
        dates.map(date => (
          <div key={date} className="list-day-section">
            <div className="list-day-header">
              <FiCalendar />
              <h3>{date}</h3>
            </div>
            <div className="list-classes">
              {groupedEvents[date].map((event, index) => (
                <motion.div 
                  key={event.id || `${date}-event-${index}`}
                  className={`list-class-item ${event.category === 'class' ? 'class-event' : 'task-event'}`}
                  whileHover={{ x: 4, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
                  onClick={() => onEventClick(event)}
                >
                  <div className="list-class-time">
                    <FiClock />
                    <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
                  </div>
                  <div className="list-class-info">
                    <h4>{event.title}</h4>
                    {(event.courseCode || event.resource?.courseCode) && (
                      <div className="list-course-code">
                        <FiBook />
                        <span>{event.courseCode || event.resource?.courseCode}</span>
                      </div>
                    )}
                    {(event.location || event.resource?.location) && (
                      <div className="list-location">
                        <FiMapPin />
                        <span>{event.location || event.resource?.location}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="no-classes">
          <p>No events scheduled</p>
        </div>
      )}
    </motion.div>
  );
};

export default ScheduleListView;
