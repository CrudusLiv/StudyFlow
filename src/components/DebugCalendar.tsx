import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { scheduleService } from '../services/scheduleService';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/components/DebugCalendar.css';

const localizer = momentLocalizer(moment);

const DebugCalendar = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const fetchAndDisplayClasses = async () => {
      try {
        setLoading(true);
        const classes = await scheduleService.fetchClasses();
        console.log('Raw classes fetched:', classes);
        
        if (!classes || classes.length === 0) {
          setError('No classes found in database');
          setLoading(false);
          return;
        }

        // Create direct event objects in the exact format BigCalendar expects
        const formattedEvents = classes.flatMap(classItem => {
          const events = [];
          try {
            // Get semester dates or use defaults
            const startDate = classItem.semesterDates?.startDate 
              ? new Date(classItem.semesterDates.startDate)
              : new Date();
            const endDate = classItem.semesterDates?.endDate
              ? new Date(classItem.semesterDates.endDate)
              : new Date(new Date().setMonth(new Date().getMonth() + 3));
            
            let currentDate = new Date(startDate);
            
            // Create recurring events for each class day
            while (currentDate <= endDate) {
              // Check if current day matches class day
              if (currentDate.toLocaleDateString('en-us', { weekday: 'long' }) === classItem.day) {
                // Parse class times
                const [startHour, startMinute] = classItem.startTime.split(':').map(Number);
                const [endHour, endMinute] = classItem.endTime.split(':').map(Number);
                
                // Create event start and end times
                const eventStart = new Date(currentDate);
                eventStart.setHours(startHour, startMinute, 0);
                
                const eventEnd = new Date(currentDate);
                eventEnd.setHours(endHour, endMinute, 0);
                
                events.push({
                  id: `debug-class-${classItem._id}-${currentDate.toISOString()}`,
                  title: `${classItem.courseName} (${classItem.courseCode})`,
                  start: eventStart,
                  end: eventEnd,
                  allDay: false,
                  resource: {
                    type: 'class',
                    courseCode: classItem.courseCode,
                    location: classItem.location,
                    courseName: classItem.courseName
                  }
                });
              }
              
              // Move to next day
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } catch (err) {
            console.error('Error processing class:', classItem, err);
          }
          return events;
        });
        
        console.log('Direct formatted events:', formattedEvents);
        setDebugInfo({
          classCount: classes.length,
          eventCount: formattedEvents.length,
          sampleEvent: formattedEvents[0]
        });
        setEvents(formattedEvents);
        setLoading(false);
      } catch (err) {
        console.error('Error in debug calendar:', err);
        setError('Failed to load calendar data');
        setLoading(false);
      }
    };
    
    fetchAndDisplayClasses();
  }, []);

  // Create a custom event component to ensure visibility
  const EventComponent = ({ event }: any) => (
    <div className="debug-event">
      <strong>{event.title}</strong>
      <div>{moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}</div>
      {event.resource?.location && <div>📍 {event.resource.location}</div>}
    </div>
  );

  if (loading) return <div className="debug-loading">Loading class data...</div>;
  
  if (error) return <div className="debug-error">{error}</div>;

  return (
    <div className="debug-calendar-container">
      <div className="debug-info">
        <h3>Debug Information</h3>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        <p>Total events: {events.length}</p>
        <p>First event: {events[0]?.title}</p>
        <p>Date range: {events[0]?.start.toString()} to {events[events.length-1]?.end.toString()}</p>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        components={{
          event: EventComponent
        }}
        eventPropGetter={() => ({
          className: 'debug-calendar-event'
        })}
      />
    </div>
  );
};

export default DebugCalendar;
