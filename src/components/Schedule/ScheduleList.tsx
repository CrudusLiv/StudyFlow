import styles from './ScheduleList.module.css';

interface ScheduleListProps {
  schedules: { time: string; activity: string }[];
}

const ScheduleList: React.FC<ScheduleListProps> = ({ schedules }) => {
  return (
    <ul className={styles.list}>
      {schedules.map((schedule, index) => (
        <li key={index} className={styles.item}>
          <span className={styles.time}>{schedule.time}</span>
          <span className={styles.activity}>{schedule.activity}</span>
        </li>
      ))}
    </ul>
  );
};

export default ScheduleList;
