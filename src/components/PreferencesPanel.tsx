import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiClock, FiSun, FiMoon, FiSettings, FiAlertCircle, FiCalendar, FiSlack } from 'react-icons/fi';
import '../styles/components/PreferencesPanel.css';

interface PreferencesPanelProps {
  onClose: () => void;
  preferences: any;
  setPreferences: (prefs: any) => void;
  onSave: () => void;
  loading: boolean;
  error: string | null;
  success: string | null;
}

const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
  onClose,
  preferences,
  setPreferences,
  onSave,
  loading,
  error,
  success
}) => {
  // Format date for input type="date" (YYYY-MM-DD)
  const formatDateForInput = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  };

  // Get today and a date 4 months in the future as defaults if needed
  const defaultStartDate = new Date();
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 4);
  
  // Initialize semester dates from preferences or defaults
  const [semesterStartDate, setSemesterStartDate] = useState<string>(
    formatDateForInput(preferences.semesterDates?.startDate) || formatDateForInput(defaultStartDate)
  );
  const [semesterEndDate, setSemesterEndDate] = useState<string>(
    formatDateForInput(preferences.semesterDates?.endDate) || formatDateForInput(defaultEndDate)
  );

  // Update semesterDates in preferences when the date inputs change
  useEffect(() => {
    if (semesterStartDate && semesterEndDate) {
      setPreferences({
        ...preferences,
        semesterDates: {
          startDate: semesterStartDate,
          endDate: semesterEndDate
        }
      });
    }
  }, [semesterStartDate, semesterEndDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setPreferences({ ...preferences, [name]: checked });
    } else if (type === 'number') {
      setPreferences({ ...preferences, [name]: Number(value) });
    } else {
      setPreferences({ ...preferences, [name]: value });
    }
  };

  const handleTimePreferenceChange = (time: string) => {
    const currentPreferences = [...(preferences.preferredStudyTimes || [])];
    
    if (currentPreferences.includes(time)) {
      // Remove the time
      setPreferences({
        ...preferences,
        preferredStudyTimes: currentPreferences.filter(t => t !== time)
      });
    } else {
      // Add the time
      setPreferences({
        ...preferences,
        preferredStudyTimes: [...currentPreferences, time]
      });
    }
  };

  return (
    <div className="preferences-panel">
      <div className="preferences-header">
        <h3><FiSettings /> Study Schedule Preferences</h3>
        <button className="close-button" onClick={onClose}><FiX /></button>
      </div>

      {error && (
        <div className="preference-error">
          <FiAlertCircle /> {error}
        </div>
      )}

      {success && (
        <div className="preference-success">
          {success}
        </div>
      )}

      <div className="preferences-content">
        <div className="preference-section">
          <h4><FiCalendar /> Semester Dates</h4>
          
          <div className="preference-row">
            <label>Semester Start Date</label>
            <input
              type="date"
              value={semesterStartDate}
              onChange={(e) => setSemesterStartDate(e.target.value)}
            />
          </div>
          
          <div className="preference-row">
            <label>Semester End Date</label>
            <input
              type="date"
              value={semesterEndDate}
              onChange={(e) => setSemesterEndDate(e.target.value)}
            />
          </div>
          
          <p className="preference-info-text">
            These dates will be used to set course date ranges and estimate assignment due dates.
          </p>
        </div>

        <div className="preference-section">
          <h4><FiClock /> Daily Schedule</h4>
          
          <div className="preference-row">
            <label>Start Work Time</label>
            <input
              type="time"
              name="wakeUpTime"
              value={preferences.wakeUpTime || '08:00'}
              onChange={handleChange}
            />
          </div>
          
          <div className="preference-row">
            <label>End Day Time</label>
            <input
              type="time"
              name="sleepTime"
              value={preferences.sleepTime || '23:00'}
              onChange={handleChange}
            />
          </div>
          
          <div className="preference-row">
            <label>Maximum Study Hours Per Day</label>
            <input
              type="number"
              name="studyHoursPerDay"
              min="1"
              max="12"
              value={preferences.studyHoursPerDay || 4}
              onChange={handleChange}
            />
          </div>

          <div className="preference-row">
            <label>Ideal Study Session Length (hours)</label>
            <input
              type="number"
              name="preferredSessionLength"
              min="0.5"
              max="4"
              step="0.5"
              value={preferences.preferredSessionLength || 2}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="preference-section">
          <h4><FiSun /> Preferred Study Times</h4>
          
          <div className="preference-check-group">
            <div 
              className={`time-preference ${preferences.preferredStudyTimes?.includes('morning') ? 'active' : ''}`}
              onClick={() => handleTimePreferenceChange('morning')}
            >
              Morning (8-12)
            </div>
            <div 
              className={`time-preference ${preferences.preferredStudyTimes?.includes('afternoon') ? 'active' : ''}`}
              onClick={() => handleTimePreferenceChange('afternoon')}
            >
              Afternoon (12-16)
            </div>
            <div 
              className={`time-preference ${preferences.preferredStudyTimes?.includes('evening') ? 'active' : ''}`}
              onClick={() => handleTimePreferenceChange('evening')}
            >
              Evening (16-20)
            </div>
            <div 
              className={`time-preference ${preferences.preferredStudyTimes?.includes('night') ? 'active' : ''}`}
              onClick={() => handleTimePreferenceChange('night')}
            >
              Night (20-24)
            </div>
          </div>
        </div>

        <div className="preference-section">
          <h4><FiSlack /> Break Schedule</h4>
          
          <div className="preference-row">
            <label>Short Break Duration (minutes)</label>
            <input
              type="number"
              name="breakDuration"
              min="5"
              max="60"
              value={preferences.breakDuration || 15}
              onChange={handleChange}
            />
          </div>
          
          <div className="preference-row">
            <label>Long Break Duration (minutes)</label>
            <input
              type="number"
              name="longBreakDuration"
              min="15"
              max="120"
              value={preferences.longBreakDuration || 30}
              onChange={handleChange}
            />
          </div>
          
          <div className="preference-row">
            <label>Sessions Before Long Break</label>
            <input
              type="number"
              name="sessionsBeforeLongBreak"
              min="1"
              max="10"
              value={preferences.sessionsBeforeLongBreak || 4}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="preference-section">
          <h4><FiCalendar /> Weekly Schedule</h4>
          
          <div className="preference-row checkbox-row">
            <label>Include Weekend Study Sessions</label>
            <input
              type="checkbox"
              name="weekendStudy"
              checked={preferences.weekendStudy !== false}
              onChange={handleChange}
            />
          </div>

          <div className="preference-row">
            <label>Minimum Days Between Sessions</label>
            <input
              type="number"
              name="minimumDaysBetweenSessions"
              min="0"
              max="7"
              value={preferences.minimumDaysBetweenSessions || 1}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="preference-section">
          <h4>Advanced Options</h4>
          
          <div className="preference-row checkbox-row">
            <label>Use Spaced Repetition (spread out similar topics)</label>
            <input
              type="checkbox"
              name="preferSpacedRepetition"
              checked={preferences.preferSpacedRepetition !== false}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="preferences-footer">
        <button 
          className={`save-preference-button ${loading ? 'loading' : ''}`} 
          onClick={onSave}
          disabled={loading}
        >
          <FiSave /> {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default PreferencesPanel;
