import { useState } from "react";

interface Reminder {
  id: number;
  title: string;
  date: string;
  time: string;
  description: string;
}

const Notifications = () => {
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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Notifications & Reminders
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Set New Reminder</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="date"
                value={newReminder.date}
                onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="time"
                value={newReminder.time}
                onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
              <textarea
                placeholder="Description"
                value={newReminder.description}
                onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                className="w-full p-2 border rounded-lg h-24"
              />
              <button
                onClick={handleAddReminder}
                className="w-full bg-blue-600 text-black py-2 rounded-lg hover:bg-blue-700"
              >
                Set Reminder
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Upcoming Reminders</h2>
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{reminder.title}</h3>
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-gray-600">{reminder.description}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    {reminder.date} at {reminder.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};

export default Notifications;
