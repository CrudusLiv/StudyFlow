import { useState } from "react";
import '../styles/pages/Notifications.css';

interface Reminder {
  id: number;
  title: string;
  date: string;
  time: string;
  description: string;
}

const Notifications: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState<Reminder>({
    id: Date.now(),
    title: "",
    date: "",
    time: "",
    description: ""
  });

  const handleAddReminder = () => {
    if (!newReminder.title || !newReminder.date || !newReminder.time) return;
    setReminders([...reminders, { ...newReminder, id: Date.now() }]);
    setNewReminder({
      id: Date.now(),
      title: "",
      date: "",
      time: "",
      description: ""
    });
  };

  const handleDeleteReminder = (id: number) => {
    setReminders(reminders.filter(reminder => reminder.id !== id));
  };

  return (
    <div className="notifications-container">
      <div className="notifications-wrapper">
        <h2 className="notifications-title">Notifications</h2>
        
        <div className="notifications-list">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="notification-item">
              <h3 className="notification-title">{reminder.title}</h3>
              <p className="notification-description">{reminder.description}</p>
              <span className="notification-time">
                {reminder.date} at {reminder.time}
              </span>
              <button
                onClick={() => handleDeleteReminder(reminder.id)}
                className="delete-button"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
