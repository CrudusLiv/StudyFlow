import { useState, useEffect } from 'react';

interface TimeDistributionProps {
  studyHours: number;
}

const TimeDistribution: React.FC<TimeDistributionProps> = ({ studyHours }) => {
  const [timeData, setTimeData] = useState({
    studyTime: studyHours,
    restTime: 8, // Fixed rest time for sleep
    availableTime: 16 - studyHours // 24 - 8(sleep) = 16 available hours
  });

  useEffect(() => {
    setTimeData({
      studyTime: studyHours,
      restTime: 8,
      availableTime: 16 - studyHours
    });
  }, [studyHours]);

  const totalWidth = 100;
  const studyWidth = (timeData.studyTime / 24) * totalWidth;
  const restWidth = (timeData.restTime / 24) * totalWidth;
  const availableWidth = (timeData.availableTime / 24) * totalWidth;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 className="text-xl font-semibold mb-4">Daily Time Distribution</h3>
      
      <div className="w-full h-8 flex rounded-lg overflow-hidden mb-4">
        <div 
          style={{ width: `${studyWidth}%` }}
          className="bg-blue-500 flex items-center justify-center text-white text-sm"
        >
          {timeData.studyTime}h
        </div>
        <div 
          style={{ width: `${restWidth}%` }}
          className="bg-gray-500 flex items-center justify-center text-white text-sm"
        >
          {timeData.restTime}h
        </div>
        <div 
          style={{ width: `${availableWidth}%` }}
          className="bg-green-500 flex items-center justify-center text-white text-sm"
        >
          {timeData.availableTime}h
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="flex flex-col">
          <span className="text-sm text-gray-600">Study Time</span>
          <span className="font-semibold text-blue-500">{timeData.studyTime} hours</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-600">Rest Time</span>
          <span className="font-semibold text-gray-500">{timeData.restTime} hours</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-600">Available Time</span>
          <span className="font-semibold text-green-500">{timeData.availableTime} hours</span>
        </div>
      </div>
    </div>
  );
};

export default TimeDistribution;
