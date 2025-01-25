import { useState } from 'react';
import styles from './Planner.module.css';

const Planner = () => {
  const [tasks, setTasks] = useState<string[]>([]);

  const addTask = (task: string) => {
    if (task.trim()) {
      setTasks((prev) => [...prev, task]);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Your Tasks</h2>
      <div className={styles.inputContainer}>
        <input
          type="text"
          placeholder="Add a task"
          className={styles.input}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addTask(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>
      <ul className={styles.taskList}>
        {tasks.map((task, index) => (
          <li key={index} className={styles.task}>
            {task}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Planner;
