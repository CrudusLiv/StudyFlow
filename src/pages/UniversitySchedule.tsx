import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/pages/UniversitySchedule.css';
import {
  FiCalendar,
  FiUpload,
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

const SAMPLE_SCHEDULE: DaySchedule[] = [
  {
    day: 'Monday',
    classes: [
      {
        courseName: 'Advanced Mathematics',
        startTime: '09:00',
        endTime: '10:30',
        location: 'Room 301',
        professor: 'Dr. Smith'
      },
      {
        courseName: 'Physics Lab',
        startTime: '11:00',
        endTime: '13:00',
        location: 'Lab Building B',
        professor: 'Prof. Johnson'
      }
    ]
  },
  {
    day: 'Tuesday',
    classes: [
      {
        courseName: 'Computer Science',
        startTime: '10:00',
        endTime: '12:00',
        location: 'Tech Hub 201',
        professor: 'Dr. Williams'
      }
    ]
  },
  {
    day: 'Wednesday',
    classes: [
      {
        courseName: 'Data Structures',
        startTime: '13:00',
        endTime: '15:00',
        location: 'Room 405',
        professor: 'Prof. Davis'
      }
    ]
  },
  {
    day: 'Thursday',
    classes: [
      {
        courseName: 'Software Engineering',
        startTime: '09:00',
        endTime: '11:00',
        location: 'Tech Hub 102',
        professor: 'Dr. Brown'
      }
    ]
  },
  {
    day: 'Friday',
    classes: [
      {
        courseName: 'Database Systems',
        startTime: '14:00',
        endTime: '16:00',
        location: 'Room 201',
        professor: 'Prof. Miller'
      }
    ]
  }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8; // Start from 8 AM
  return `${hour.toString().padStart(2, '0')}:00`;
});

const UniversitySchedule: React.FC = () => {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [newClass, setNewClass] = useState<Class>({
    courseName: '',
    startTime: '',
    endTime: '',
    location: '',
    professor: ''
  });
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');
  const listViewRef = React.useRef<HTMLDivElement>(null);
  const gridViewRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
      setSchedule(SAMPLE_SCHEDULE);
      setLoading(false);
    // try {
    //   const token = localStorage.getItem('token');
    //   const response = await axios.get('http://localhost:5000/university-schedule', {
    //     headers: { Authorization: `Bearer ${token}` }
    //   });
      
    //   if (response.data.weeklySchedule) {
    //     setSchedule(response.data.weeklySchedule);
    //   } else {
    //     // Initialize empty schedule if none exists
    //     setSchedule(DAYS.map(day => ({ day, classes: [] })));
    //   }
    // } catch (error) {
    //   console.error('Error fetching schedule:', error);
    // } finally {
    //   setLoading(false);
    // }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5000/university-schedule/import', 
          formData,
          { headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }}
        );
        setSchedule(response.data.weeklySchedule);
      } catch (error) {
        console.error('Error uploading schedule:', error);
      }
    }
  };

  const handleAddClass = async () => {
    if (!selectedDay) return;

    try {
      const updatedSchedule = schedule.map(day => {
        if (day.day === selectedDay) {
          return {
            ...day,
            classes: [...day.classes, newClass].sort((a, b) => 
              a.startTime.localeCompare(b.startTime)
            )
          };
        }
        return day;
      });

      const token = localStorage.getItem('token');
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
    } catch (error) {
      console.error('Error adding class:', error);
    }
  };

  const handleViewToggle = (view: 'grid' | 'list') => {
    setActiveView(view);
    if (view === 'list' && listViewRef.current) {
      listViewRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (view === 'grid' && gridViewRef.current) {
      gridViewRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
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
          <label className="import-button">
            <FiUpload className="button-icon" />
            Import Schedule
            <input
              type="file"
              accept=".pdf,.csv,.xlsx"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            className="add-button"
          >
            <FiPlusCircle className="button-icon" />
            Add Class
          </button>
        </div>
      </div>

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
        ref={gridViewRef} 
        className="schedule-table-container"
        style={{ display: activeView === 'grid' ? 'block' : 'none' }}
      >
        <table className="schedule-table">
          <thead className="table-header">
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
                    timeSlot >= c.startTime && timeSlot < c.endTime
                  );

                  return (
                    <td key={`${day}-${timeSlot}`} className="schedule-cell">
                      {classAtTime && (
                        <div className="class-card" style={{
                          backgroundColor: getClassColor(classAtTime.courseName).bg,
                          borderLeftColor: getClassColor(classAtTime.courseName).border
                        }}>
                          <div className="class-title" style={{ color: getClassColor(classAtTime.courseName).text }}>
                            {classAtTime.courseName}
                          </div>
                          <div className="class-details">
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
        <hr></hr>
        <div className="schedule-list">
          {schedule.map(daySchedule => (
            <div key={daySchedule.day} className="schedule-list-item">
              <h3>{daySchedule.day}</h3>
              <ul>
                {daySchedule.classes.map(classItem => (
                  <li key={classItem.courseName}>
                    <div className="class-card" style={{
                      backgroundColor: getClassColor(classItem.courseName).bg,
                      borderLeftColor: getClassColor(classItem.courseName).border
                    }}>
                      <div className="class-title" style={{ color: getClassColor(classItem.courseName).text }}>
                        {classItem.courseName}
                      </div>
                      <div className="class-details">
                        <div>{classItem.location}</div>
                        <div>{classItem.professor}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div 
        ref={listViewRef} 
        className="schedule-list"
        style={{ display: activeView === 'list' ? 'grid' : 'none' }}
      >
        {schedule.map(daySchedule => (
          <div key={daySchedule.day} className="schedule-list-item">
            <h3>{daySchedule.day}</h3>
            <ul>
              {daySchedule.classes.map(classItem => (
                <li key={classItem.courseName}>
                  <div className="class-card" style={{
                    backgroundColor: getClassColor(classItem.courseName).bg,
                    borderLeftColor: getClassColor(classItem.courseName).border
                  }}>
                    <div className="class-title" style={{ color: getClassColor(classItem.courseName).text }}>
                      {classItem.courseName}
                    </div>
                    <div className="class-details">
                      <div>{classItem.location}</div>
                      <div>{classItem.professor}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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
