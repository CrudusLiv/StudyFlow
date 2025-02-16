import { useState, useEffect } from 'react';
import { BsClock, BsBook } from 'react-icons/bs';
import { FaBed } from 'react-icons/fa';
import { MdOutlineMoreTime } from 'react-icons/md';

interface TimeDistributionProps {
  studyHours: number;
}

const TimeDistribution: React.FC<TimeDistributionProps> = ({ studyHours }) => {
  const [timeData, setTimeData] = useState({
    studyTime: studyHours,
    restTime: 8,
    availableTime: 16 - studyHours
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
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BsClock className="text-xl text-indigo-600" />
        Daily Time Distribution
      </h3>
      
      <div className="w-full h-8 flex rounded-lg overflow-hidden mb-4">
        <div 
          style={{ width: `${studyWidth}%` }}
          className="bg-blue-500 flex items-center justify-center text-white text-sm gap-1"
        >
          <BsBook />
          {timeData.studyTime}h
        </div>
        <div 
          style={{ width: `${restWidth}%` }}
          className="bg-gray-500 flex items-center justify-center text-white text-sm gap-1"
        >
          <FaBed />
          {timeData.restTime}h
        </div>
        <div 
          style={{ width: `${availableWidth}%` }}
          className="bg-green-500 flex items-center justify-center text-white text-sm gap-1"
        >
          <MdOutlineMoreTime />
          {timeData.availableTime}h
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <BsBook className="text-blue-500" />
            Study Time
          </span>
          <span className="font-semibold text-blue-500">{timeData.studyTime} hours</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <FaBed className="text-gray-500" />
            Rest Time
          </span>
          <span className="font-semibold text-gray-500">{timeData.restTime} hours</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <MdOutlineMoreTime className="text-green-500" />
            Available Time
          </span>
          <span className="font-semibold text-green-500">{timeData.availableTime} hours</span>
        </div>
      </div>
    </div>
  );
};

export default TimeDistribution;
