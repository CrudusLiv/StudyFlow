import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/pages/UniversitySchedule.css';
import {
  FiCalendar,
  FiPlusCircle,
  FiClock,
  FiMapPin,
  FiUser,
  FiBook,
  FiX,
  FiCheck,
  FiGrid,
  FiList
} from 'react-icons/fi';

interface Class {
  courseName: string;
  startTime: string;
  endTime: string;
  location: string;
  professor: string;
}

interface DaySchedule {
  day: string;
  classes: Class[];
}

interface APIResponse {
  weeklySchedule: {
    day: string;
    classes: Class[];
  }[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8; // Start from 8 AM
  return `${hour.toString().padStart(2, '0')}:00`;
});

const getClassColor = (courseName: string) => {
  const colors = [
    { bg: '#EEF2FF', border: '#4F46E5', text: '#4F46E5' }, // Indigo
    { bg: '#F0FDF4', border: '#16A34A', text: '#16A34A' }, // Green
    { bg: '#FEF2F2', border: '#DC2626', text: '#DC2626' }, // Red
    { bg: '#FFF7ED', border: '#EA580C', text: '#EA580C' }, // Orange
    { bg: '#F0F9FF', border: '#0284C7', text: '#0284C7' }, // Sky
    { bg: '#FAF5FF', border: '#9333EA', text: '#9333EA' }, // Purple
  ];
  
  let hash = 0;
  for (let i = 0; i < courseName.length; i++) {
    hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const UniversitySchedule: React.FC = () => {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');
  const [newClass, setNewClass] = useState<Class>({
    courseName: '',
    startTime: '',
    endTime: '',
    location: '',
    professor: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const transformScheduleData = (responseData: APIResponse): DaySchedule[] => {
    // Transform API response to match the schedule structure
    const transformedSchedule = DAYS.map(day => {
      const dayData = responseData.weeklySchedule.find(d => d.day === day);
      return {
        day,
        classes: dayData?.classes?.map(cls => ({
          ...cls,
          // Ensure time format is consistent
          startTime: cls.startTime.includes(':') ? cls.startTime : `${cls.startTime}:00`,
          endTime: cls.endTime.includes(':') ? cls.endTime : `${cls.endTime}:00`
        })) || []
      };
    });

    // Sort classes by start time within each day
    return transformedSchedule.map(day => ({
      ...day,
      classes: day.classes.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
  };

  const isClassInTimeSlot = (classItem: Class, timeSlot: string): boolean => {
    const slotTime = timeSlot.split(':')[0];
    const startHour = classItem.startTime.split(':')[0];
    const endHour = classItem.endTime.split(':')[0];
    
    return parseInt(slotTime) >= parseInt(startHour) && 
           parseInt(slotTime) < parseInt(endHour);
  };

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get<APIResponse>('http://localhost:5000/university-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.weeklySchedule) {
        setSchedule(transformScheduleData(response.data));
      } else {
        setSchedule(DAYS.map(day => ({ day, classes: [] })));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load schedule';
      console.error('Error fetching schedule:', errorMessage);
      setError('Failed to load schedule. Please try again.');
      setSchedule(DAYS.map(day => ({ day, classes: [] })));
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async () => {
    if (!selectedDay) {
      setError('Please select a day');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      // Validate time format
      if (newClass.startTime >= newClass.endTime) {
        setError('End time must be after start time');
        return;
      }

      const updatedSchedule = schedule.map(day => {
        if (day.day === selectedDay) {
          const updatedClasses = [...day.classes, newClass]
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          // Check for time conflicts
          for (let i = 1; i < updatedClasses.length; i++) {
            if (updatedClasses[i].startTime < updatedClasses[i-1].endTime) {
              throw new Error('Time conflict with existing class');
            }
          }
          
          return {
            ...day,
            classes: updatedClasses
          };
        }
        return day;
      });

      await axios.post('http://localhost:5000/university-schedule', 
        { weeklySchedule: updatedSchedule },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      setSchedule(updatedSchedule);
      setShowAddModal(false);
      setNewClass({
        courseName: '',
        startTime: '',
        endTime: '',
        location: '',
        professor: ''
      });
      setError(null);
    } catch (error: any) {
      console.error('Error adding class:', error);
      setError(error.message || 'Failed to add class. Please try again.');
    }
  };

  const handleViewToggle = (view: 'grid' | 'list') => {
    setActiveView(view);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="header-left">
          <div className="title-group">
            <FiCalendar className="header-icon" />
            <div>
              <h1 className="page-title">University Schedule</h1>
              <p className="current-date">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="action-buttons">
          <button
            onClick={() => setShowAddModal(true)}
            className="add-button"
          >
            <FiPlusCircle className="button-icon" />
            Add Class
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="view-toggle">
        <button 
          className={`view-button ${activeView === 'grid' ? 'active' : ''}`}
          onClick={() => handleViewToggle('grid')}
        >
          <FiGrid className="button-icon" /> Grid View
        </button>
        <button 
          className={`view-button ${activeView === 'list' ? 'active' : ''}`}
          onClick={() => handleViewToggle('list')}
        >
          <FiList className="button-icon" /> List View
        </button>
      </div>

      <div 
        className="schedule-table-container"
        style={{ display: activeView === 'grid' ? 'block' : 'none' }}
      >
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Time</th>
              {DAYS.map(day => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(timeSlot => (
              <tr key={timeSlot}>
                <td className="time-cell">{timeSlot}</td>
                {DAYS.map(day => {
                  const daySchedule = schedule.find(d => d.day === day);
                  const classAtTime = daySchedule?.classes.find(c => 
                    isClassInTimeSlot(c, timeSlot)
                  );

                  return (
                    <td key={`${day}-${timeSlot}`} className="schedule-cell">
                      {classAtTime && (
                        <div className="class-card" style={{
                          backgroundColor: getClassColor(classAtTime.courseName).bg,
                          borderLeftColor: getClassColor(classAtTime.courseName).border
                        }}>
                          <div className="class-title" style={{ 
                            color: getClassColor(classAtTime.courseName).text 
                          }}>
                            {classAtTime.courseName}
                          </div>
                          <div className="class-details">
                            <div>{classAtTime.startTime} - {classAtTime.endTime}</div>
                            <div>{classAtTime.location}</div>
                            <div>{classAtTime.professor}</div>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div 
        className="schedule-list"
        style={{ display: activeView === 'list' ? 'grid' : 'none' }}
      >
        {schedule.map(daySchedule => (
          <div key={daySchedule.day} className="schedule-list-item">
            <h3>{daySchedule.day}</h3>
            {daySchedule.classes.length === 0 ? (
              <p className="no-classes">No classes scheduled</p>
            ) : (
              <ul>
                {daySchedule.classes.map((classItem, index) => (
                  <li key={`${classItem.courseName}-${index}`}>
                    <div className="class-card" style={{
                      backgroundColor: getClassColor(classItem.courseName).bg,
                      borderLeftColor: getClassColor(classItem.courseName).border
                    }}>
                      <div className="class-title" style={{ 
                        color: getClassColor(classItem.courseName).text 
                      }}>
                        {classItem.courseName}
                      </div>
                      <div className="class-details">
                        <div>{classItem.startTime} - {classItem.endTime}</div>
                        <div>{classItem.location}</div>
                        <div>{classItem.professor}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                <FiPlusCircle className="modal-icon" /> Add New Class
              </h2>
              <button 
                className="close-button"
                onClick={() => setShowAddModal(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="form-group">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="form-select"
              >
                <option value="">Select Day</option>
                {DAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <div className="input-group">
                <FiBook className="input-icon" />
                <input
                  type="text"
                  placeholder="Course Name"
                  value={newClass.courseName}
                  onChange={(e) => setNewClass({ ...newClass, courseName: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="time-inputs">
                <div className="input-group">
                  <FiClock className="input-icon" />
                  <input
                    type="time"
                    value={newClass.startTime}
                    onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="input-group">
                  <FiClock className="input-icon" />
                  <input
                    type="time"
                    value={newClass.endTime}
                    onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="input-group">
                <FiMapPin className="input-icon" />
                <input
                  type="text"
                  placeholder="Location"
                  value={newClass.location}
                  onChange={(e) => setNewClass({ ...newClass, location: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  placeholder="Professor"
                  value={newClass.professor}
                  onChange={(e) => setNewClass({ ...newClass, professor: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button
                onClick={() => setShowAddModal(false)}
                className="cancel-button"
              >
                <FiX className="button-icon" /> Cancel
              </button>
              <button
                onClick={handleAddClass}
                className="save-button"
              >
                <FiCheck className="button-icon" /> Add Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversitySchedule;
