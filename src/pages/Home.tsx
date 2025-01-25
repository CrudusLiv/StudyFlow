import styles from './Home.module.css';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>StudyFlow AI</h1>
      <p className={styles.description}>
        Plan smarter, study better. Your AI-based planner is here to help!
      </p>
        <Link to="/planner">
            <button className={styles.button}>Planner</button>
        </Link>
        <Link to="/schedule">
            <button className={styles.button}>Schedule</button>
        </Link>
    </div>
  );
};

export default Home;
