import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/pages/Notifications.css";
import {
  pageVariants,
  containerVariants,
  listVariants,
  listItemVariants,
  fadeIn,
} from "../utils/animationConfig";

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
    description: "",
  });

  const handleAddReminder = () => {
    if (!newReminder.title || !newReminder.date || !newReminder.time) return;
    setReminders([...reminders, { ...newReminder, id: Date.now() }]);
    setNewReminder({
      id: Date.now(),
      title: "",
      date: "",
      time: "",
      description: "",
    });
  };

  const handleDeleteReminder = (id: number) => {
    setReminders(reminders.filter((reminder) => reminder.id !== id));
  };

  return (
    <motion.div
      className="notifications-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <motion.header variants={containerVariants}>
        <h2 className="notifications-title">Notifications</h2>
      </motion.header>

      <motion.div className="notifications-list" variants={containerVariants}>
        {reminders.length > 0 ? (
          <motion.div initial="hidden" animate="visible" variants={listVariants}>
            <AnimatePresence>
              {reminders.map((reminder) => (
                <motion.div
                  key={reminder.id}
                  className="notification-item"
                  variants={listItemVariants}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  layout
                >
                  <h3 className="notification-title">{reminder.title}</h3>
                  <p className="notification-description">
                    {reminder.description}
                  </p>
                  <span className="notification-time">
                    {reminder.date} at {reminder.time}
                  </span>
                  <button
                    onClick={() => handleDeleteReminder(reminder.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div className="empty-state" variants={fadeIn}>
            <span className="empty-icon">🔔</span>
            <h3>No Notifications</h3>
            <p>
              You're all caught up! We'll notify you when something new arrives.
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Notifications;
