import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
          University Schedule
        </h1>
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <label className="btn bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 cursor-pointer text-sm sm:text-base">
            Import Schedule
            <input
              type="file"
              accept=".pdf,.csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm sm:text-base"
          >
            Add Class
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Time
                </th>
                {DAYS.map(day => (
                  <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {TIME_SLOTS.map(timeSlot => (
                <tr key={timeSlot} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {timeSlot}
                  </td>
                  {DAYS.map(day => {
                    const daySchedule = schedule.find(d => d.day === day);
                    const classAtTime = daySchedule?.classes.find(c => 
                      timeSlot >= c.startTime && timeSlot < c.endTime
                    );

                    return (
                      <td key={`${day}-${timeSlot}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {classAtTime && (
                          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded">
                            <div className="font-medium text-indigo-700 dark:text-indigo-300">{classAtTime.courseName}</div>
                            <div className="text-xs">
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
      </div>

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add New Class</h2>
            <div className="space-y-4">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
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
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="time"
                  value={newClass.startTime}
                  onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <input
                  type="time"
                  value={newClass.endTime}
                  onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <input
                type="text"
                placeholder="Location"
                value={newClass.location}
                onChange={(e) => setNewClass({ ...newClass, location: e.target.value })}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <input
                type="text"
                placeholder="Professor"
                value={newClass.professor}
                onChange={(e) => setNewClass({ ...newClass, professor: e.target.value })}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClass}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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
