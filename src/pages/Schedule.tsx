import { useState } from 'react';
import ScheduleForm from '../components/Schedule/ScheduleForm';
import ScheduleList from '../components/Schedule/ScheduleList';
import styles from './Schedule.module.css';

const Schedule = () => {
  const [schedules, setSchedules] = useState<{ time: string; activity: string }[]>([]);

  const addSchedule = (schedule: { time: string; activity: string }) => {
    setSchedules((prev) => [...prev, schedule]);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Daily Schedule</h2>
      <ScheduleForm addSchedule={addSchedule} />
      <ScheduleList schedules={schedules} />
    </div>
  );
};

export default Schedule;
