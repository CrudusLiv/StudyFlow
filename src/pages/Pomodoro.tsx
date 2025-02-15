import { useState, useEffect } from 'react';

const Pomodoro = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    let interval: number;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer completed
            if (mode === 'work') {
              setMode('break');
              setMinutes(5);
              setCycles(prev => prev + 1);
            } else {
              setMode('work');
              setMinutes(25);
            }
            setIsActive(false);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, mode]);
  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMode('work');
    setMinutes(25);
    setSeconds(0);
    setCycles(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-center mb-6">
              Pomodoro Timer
            </h1>
            
            <div className="text-6xl font-bold text-center mb-8">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>

            <div className="flex justify-center space-x-4 mb-8">
              <button
                onClick={toggleTimer}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  isActive 
                    ? 'bg-red-500 hover:bg-red-600 text-black' 
                    : 'bg-green-500 hover:bg-green-600 text-black'
                }`}
              >
                {isActive ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={resetTimer}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
              >
                Reset
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className={`text-lg font-medium ${
                mode === 'work' ? 'text-blue-600' : 'text-green-600'
              }`}>
                {mode === 'work' ? 'Work Time' : 'Break Time'}
              </div>
              <div className="text-gray-600">
                Completed Cycles: {cycles}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pomodoro;
