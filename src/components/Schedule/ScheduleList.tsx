interface ScheduleListProps {
  schedules: { time: string; activity: string }[];
}

const ScheduleList: React.FC<ScheduleListProps> = ({ schedules }) => {
  return (
    <ul className="space-y-4">
      {schedules.map((schedule, index) => (
        <li
          key={index}
          className="flex justify-between items-center p-4 bg-white shadow rounded-lg border border-gray-200"
        >
          <span className="text-indigo-700 font-medium">{schedule.time}</span>
          <span className="text-gray-700">{schedule.activity}</span>
        </li>
      ))}
    </ul>
  );
};

export default ScheduleList;
