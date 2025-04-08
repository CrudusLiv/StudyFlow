import React, { useState, useEffect } from 'react';
import { scheduleService } from '../services/scheduleService';
import { FiClock, FiFileText, FiCalendar } from 'react-icons/fi';

interface SavedSchedule {
  id: string;
  createdAt: string;
  title: string;
  assignmentCount: number;
  classCount: number;
  fileCount: number;
}

interface SavedScheduleSelectorProps {
  onScheduleSelected: (scheduleId: string) => void;
}

const SavedScheduleSelector: React.FC<SavedScheduleSelectorProps> = ({ onScheduleSelected }) => {
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSavedSchedules() {
      try {
        setLoading(true);
        const savedSchedules = await scheduleService.fetchSavedSchedules();
        setSchedules(savedSchedules);
        
        // Auto-select the most recent schedule if any exist
        if (savedSchedules.length > 0) {
          onScheduleSelected(savedSchedules[0].id);
        }
      } catch (err) {
        console.error('Error loading saved schedules:', err);
        setError('Failed to load your saved schedules');
      } finally {
        setLoading(false);
      }
    }
    
    loadSavedSchedules();
  }, [onScheduleSelected]);

  if (loading) {
    return <div className="saved-schedule-selector loading">Loading saved schedules...</div>;
  }

  if (error) {
    return <div className="saved-schedule-selector error">{error}</div>;
  }

  if (schedules.length === 0) {
    return (
      <div className="saved-schedule-selector empty">
        <p>No saved schedules found. Upload PDF documents to generate a schedule.</p>
      </div>
    );
  }

  return (
    <div className="saved-schedule-selector">
      <h3>Your Saved Schedules</h3>
      <div className="schedule-list">
        {schedules.map(schedule => (
          <div 
            key={schedule.id} 
            className="schedule-item"
            onClick={() => onScheduleSelected(schedule.id)}
          >
            <div className="schedule-item-header">
              <div className="schedule-title">{schedule.title}</div>
              <div className="schedule-date">
                <FiClock />
                {new Date(schedule.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="schedule-item-stats">
              <div className="stat">
                <FiCalendar /> {schedule.assignmentCount} assignments
              </div>
              <div className="stat">
                <FiFileText /> {schedule.fileCount} files
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedScheduleSelector;
