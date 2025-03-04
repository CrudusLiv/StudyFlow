import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/pages/UniversitySchedule.css';

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

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/university-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.weeklySchedule) {
        setSchedule(response.data.weeklySchedule);
      } else {
        // Initialize empty schedule if none exists
        setSchedule(DAYS.map(day => ({ day, classes: [] })));
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h1 className="page-title">University Schedule</h1>
        <div className="action-buttons">
          <label className="import-label">
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
            className="add-class-button"
          >
            Add Class
          </button>
        </div>
      </div>

      <div className="schedule-table-container">
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
                        <div className="class-card">
                          <div className="class-title">{classAtTime.courseName}</div>
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
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Add New Class</h2>
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
              <input
                type="text"
                placeholder="Course Name"
                value={newClass.courseName}
                onChange={(e) => setNewClass({ ...newClass, courseName: e.target.value })}
                className="form-input"
              />
              <div className="time-inputs">
                <input
                  type="time"
                  value={newClass.startTime}
                  onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                  className="form-input"
                />
                <input
                  type="time"
                  value={newClass.endTime}
                  onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                  className="form-input"
                />
              </div>
              <input
                type="text"
                placeholder="Location"
                value={newClass.location}
                onChange={(e) => setNewClass({ ...newClass, location: e.target.value })}
                className="form-input"
              />
              <input
                type="text"
                placeholder="Professor"
                value={newClass.professor}
                onChange={(e) => setNewClass({ ...newClass, professor: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="modal-buttons">
              <button
                onClick={() => setShowAddModal(false)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClass}
                className="save-button"
              >
                Add Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversitySchedule;
