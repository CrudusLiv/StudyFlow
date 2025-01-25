import { useState } from 'react';
import styles from './ScheduleForm.module.css';

interface ScheduleFormProps {
  addSchedule: (schedule: { time: string; activity: string }) => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ addSchedule }) => {
  const [time, setTime] = useState('');
  const [activity, setActivity] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (time && activity) {
      addSchedule({ time, activity });
      setTime('');
      setActivity('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className={styles.input}
        required
      />
      <input
        type="text"
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
        placeholder="Enter activity (e.g., Math class)"
        className={styles.input}
        required
      />
      <button type="submit" className={styles.button}>
        Add Schedule
      </button>
    </form>
  );
};

export default ScheduleForm;
