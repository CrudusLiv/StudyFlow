import { useState } from "react";

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
    <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Notifications</h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{reminder.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{reminder.description}</p>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {reminder.date} at {reminder.time}
                </span>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
