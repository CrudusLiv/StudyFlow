import { Link } from 'react-router-dom';
import { BsCalendarCheck, BsGraphUp, BsClock, BsBook, BsFire, BsCheckCircle } from 'react-icons/bs';
import { RiBookmarkLine } from 'react-icons/ri';

const Home = () => {
  return (
    <div className="min-h-screen flex">
      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome back, Student!</h1>
            <p className="text-gray-600">Here's your study overview for today</p>
          </div>

        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Study Streak', value: '5 days', icon: BsFire, color: 'bg-red-100 text-red-600' },
            { label: 'Hours Today', value: '2.5 hrs', icon: BsClock, color: 'bg-blue-100 text-blue-600' },
            { label: 'Tasks Complete', value: '12/15', icon: BsCheckCircle, color: 'bg-green-100 text-green-600' },
            { label: 'Focus Score', value: '85%', icon: BsGraphUp, color: 'bg-purple-100 text-purple-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm">
              <div className={`w-12 h-12 ${stat.color} rounded-full flex items-center justify-center mb-4`}>
                <stat.icon className="text-xl" />
              </div>
              <h3 className="text-gray-500 text-sm">{stat.label}</h3>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Today's Schedule</h2>
            <div className="space-y-4">
              {[
                { subject: 'Mathematics', time: '09:00 AM', status: 'Completed' },
                { subject: 'Physics', time: '11:00 AM', status: 'In Progress' },
                { subject: 'Chemistry', time: '02:00 PM', status: 'Upcoming' },
              ].map((session, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      session.status === 'Completed' ? 'bg-green-400' :
                      session.status === 'In Progress' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium">{session.subject}</p>
                      <p className="text-sm text-gray-500">{session.time}</p>
                    </div>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    session.status === 'Completed' ? 'bg-green-100 text-green-600' :
                    session.status === 'In Progress' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Study Focus Areas */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Focus Areas</h2>
            <div className="space-y-4">
              {[
                { subject: 'Mathematics', progress: 75 },
                { subject: 'Physics', progress: 60 },
                { subject: 'Chemistry', progress: 45 },
              ].map((subject, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{subject.subject}</span>
                    <span className="text-gray-500">{subject.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div 
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${subject.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
