import React from 'react';
import { 
  FiCalendar, 
  FiClock, 
  FiBrain, 
  FiTrendUp, 
  FiActivity,
  FiBarChart2,
  FiPieChart
} from 'react-icons/fi';
import '../styles/components/ScheduleInsights.css';

interface ScheduleInsightsProps {
  schedule: any[];
}

const ScheduleInsights: React.FC<ScheduleInsightsProps> = ({ schedule }) => {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return (
      <div className="schedule-insights empty">
        <div className="empty-message">
          <FiCalendar className="empty-icon" />
          <p>No schedule data available to analyze</p>
        </div>
      </div>
    );
  }

  // Calculate overall stats
  const totalEvents = schedule.length;
  const totalStudyHours = schedule.reduce((total, event) => {
    const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
    return total + (duration / (1000 * 60 * 60)); // Convert ms to hours
  }, 0);
  
  // Count by category
  const categoryCount = schedule.reduce((counts, event) => {
    const category = event.category || 'uncategorized';
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  
  // Calculate cognitive load distribution
  const cognitiveLoadByDay = schedule.reduce((loadByDay, event) => {
    if (event.cognitiveLoad) {
      const day = new Date(event.start).toLocaleDateString('en-US', { weekday: 'long' });
      loadByDay[day] = (loadByDay[day] || 0) + (event.cognitiveLoad || 1);
    }
    return loadByDay;
  }, {});
  
  // Calculate top 3 most intensive days
  const intensiveDays = Object.entries(cognitiveLoadByDay)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([day, load]) => ({ day, load }));
  
  // Calculate complexity averages
  const complexityScores = schedule.filter(event => event.complexity?.overall).map(event => event.complexity.overall);
  const averageComplexity = complexityScores.length > 0 
    ? complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length 
    : 0;
  
  // Calculate task distribution by priority
  const priorityDistribution = schedule.reduce((counts, event) => {
    const priority = event.priority || 'medium';
    counts[priority] = (counts[priority] || 0) + 1;
    return counts;
  }, {});
  
  // Format number with 1 decimal place
  const formatNumber = (num: number) => {
    return Math.round(num * 10) / 10;
  };

  return (
    <div className="schedule-insights">
      <div className="insights-header">
        <FiBrain className="insights-icon" />
        <h3>Schedule Insights</h3>
      </div>
      
      <div className="insights-content">
        <div className="insights-summary">
          <div className="summary-card">
            <FiCalendar className="card-icon" />
            <div className="card-content">
              <div className="card-value">{totalEvents}</div>
              <div className="card-label">Total Events</div>
            </div>
          </div>
          
          <div className="summary-card">
            <FiClock className="card-icon" />
            <div className="card-content">
              <div className="card-value">{formatNumber(totalStudyHours)}</div>
              <div className="card-label">Study Hours</div>
            </div>
          </div>
          
          <div className="summary-card">
            <FiBrain className="card-icon" />
            <div className="card-content">
              <div className="card-value">{formatNumber(averageComplexity)}</div>
              <div className="card-label">Avg. Complexity</div>
            </div>
          </div>
        </div>
        
        <div className="insights-detail">
          <div className="insight-section">
            <h4>
              <FiBarChart2 className="section-icon" />
              Schedule Distribution
            </h4>
            <div className="category-chart">
              {Object.entries(categoryCount).map(([category, count]) => (
                <div key={category} className="category-item">
                  <div className="category-label">{category}</div>
                  <div className="category-bar-container">
                    <div 
                      className={`category-bar category-${category}`}
                      style={{ width: `${Math.min(100, (count as number / totalEvents) * 100)}%` }}
                    />
                  </div>
                  <div className="category-count">{count}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="insight-section">
            <h4>
              <FiActivity className="section-icon" />
              Cognitive Load
            </h4>
            <div className="intensive-days">
              <h5>Most Intensive Days</h5>
              {intensiveDays.map(({ day, load }, index) => (
                <div key={day} className="intensive-day">
                  <div className="day-rank">{index + 1}</div>
                  <div className="day-name">{day}</div>
                  <div className="load-meter">
                    <div 
                      className="load-bar"
                      style={{ 
                        width: `${Math.min(100, (load as number / 10) * 100)}%`,
                        backgroundColor: index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                  <div className="load-value">{formatNumber(load as number)}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="insight-section">
            <h4>
              <FiPieChart className="section-icon" />
              Priority Distribution
            </h4>
            <div className="priority-distribution">
              {Object.entries(priorityDistribution).map(([priority, count]) => (
                <div key={priority} className={`priority-card priority-${priority}`}>
                  <div className="priority-value">{count}</div>
                  <div className="priority-label">{priority}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="insights-footer">
          <div className="insights-tip">
            <FiTrendUp className="tip-icon" />
            <div className="tip-content">
              <h5>Pro Tip</h5>
              <p>Distribute high-complexity tasks across different days to maintain optimal cognitive capacity.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleInsights;
