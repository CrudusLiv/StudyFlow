import React, { useState } from 'react';
import { 
  FiFileText, 
  FiCalendar, 
  FiClock, 
  FiTag, 
  FiBook, 
  FiChevronDown, 
  FiChevronRight,
  FiCheckSquare
} from 'react-icons/fi';
import '../styles/components/PDFSummary.css';

interface PDFSummaryProps {
  document: {
    title: string;
    fileName: string;
    extractedData: {
      assignments: any[];
      dates: any[];
      topics: any[];
      complexity: number;
      courseCode?: string;
      instructor?: string;
      semester?: string;
    }
  }
}

const PDFSummary: React.FC<PDFSummaryProps> = ({ document }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assignments: true,
    topics: false,
    dates: false,
    metadata: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderComplexityMeter = (value: number, max: number = 10) => {
    const percentage = (value / max) * 100;
    return (
      <div className="complexity-meter">
        <div className="complexity-bar">
          <div 
            className="complexity-fill" 
            style={{ 
              width: `${percentage}%`,
              backgroundColor: percentage > 75 ? '#ef4444' : percentage > 50 ? '#f59e0b' : '#10b981'
            }} 
          />
        </div>
        <span className="complexity-value">{value.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="pdf-summary">
      <div className="pdf-summary-header">
        <FiFileText className="pdf-icon" />
        <div className="pdf-title">
          <h3>{document.title || document.fileName}</h3>
          <p className="pdf-filename">{document.fileName}</p>
        </div>
      </div>

      <div className="pdf-summary-content">
        {/* Metadata Section */}
        <div className="summary-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('metadata')}
          >
            {expandedSections.metadata ? <FiChevronDown /> : <FiChevronRight />}
            <h4>Course Information</h4>
          </div>
          
          {expandedSections.metadata && (
            <div className="section-content">
              <div className="metadata-grid">
                {document.extractedData.courseCode && (
                  <div className="metadata-item">
                    <FiTag className="metadata-icon" />
                    <div>
                      <span className="metadata-label">Course Code</span>
                      <span className="metadata-value">{document.extractedData.courseCode}</span>
                    </div>
                  </div>
                )}
                
                {document.extractedData.instructor && (
                  <div className="metadata-item">
                    <FiBook className="metadata-icon" />
                    <div>
                      <span className="metadata-label">Instructor</span>
                      <span className="metadata-value">{document.extractedData.instructor}</span>
                    </div>
                  </div>
                )}
                
                {document.extractedData.semester && (
                  <div className="metadata-item">
                    <FiCalendar className="metadata-icon" />
                    <div>
                      <span className="metadata-label">Semester</span>
                      <span className="metadata-value">{document.extractedData.semester}</span>
                    </div>
                  </div>
                )}
                
                <div className="metadata-item">
                  <FiClock className="metadata-icon" />
                  <div>
                    <span className="metadata-label">Complexity</span>
                    <div className="metadata-value">
                      {renderComplexityMeter(document.extractedData.complexity)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assignments Section */}
        <div className="summary-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('assignments')}
          >
            {expandedSections.assignments ? <FiChevronDown /> : <FiChevronRight />}
            <h4>Assignments ({document.extractedData.assignments.length})</h4>
          </div>
          
          {expandedSections.assignments && (
            <div className="section-content">
              {document.extractedData.assignments.length === 0 ? (
                <p className="no-data-message">No assignments detected</p>
              ) : (
                <div className="assignments-list">
                  {document.extractedData.assignments.map((assignment, index) => (
                    <div key={index} className="assignment-item">
                      <div className="assignment-header">
                        <h5>{assignment.title || `Assignment ${index + 1}`}</h5>
                        {assignment.type && (
                          <span className="assignment-type">{assignment.type}</span>
                        )}
                      </div>
                      
                      <div className="assignment-details">
                        {assignment.dueDate && (
                          <div className="detail-row">
                            <FiCalendar className="detail-icon" />
                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {assignment.weight && (
                          <div className="detail-row">
                            <FiTag className="detail-icon" />
                            <span>Weight: {assignment.weight}%</span>
                          </div>
                        )}
                        
                        {assignment.estimatedHours && (
                          <div className="detail-row">
                            <FiClock className="detail-icon" />
                            <span>Est. time: {assignment.estimatedHours} hours</span>
                          </div>
                        )}
                      </div>
                      
                      {assignment.requirements && assignment.requirements.length > 0 && (
                        <div className="requirements-list">
                          <h6>Requirements:</h6>
                          <ul>
                            {assignment.requirements.slice(0, 3).map((req, reqIndex) => (
                              <li key={reqIndex}>
                                <FiCheckSquare className="req-icon" />
                                {req}
                              </li>
                            ))}
                            {assignment.requirements.length > 3 && (
                              <li className="more-requirements">
                                +{assignment.requirements.length - 3} more requirements
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Topics Section */}
        <div className="summary-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('topics')}
          >
            {expandedSections.topics ? <FiChevronDown /> : <FiChevronRight />}
            <h4>Topics ({document.extractedData.topics.length})</h4>
          </div>
          
          {expandedSections.topics && (
            <div className="section-content">
              {document.extractedData.topics.length === 0 ? (
                <p className="no-data-message">No topics detected</p>
              ) : (
                <div className="topics-grid">
                  {document.extractedData.topics.map((topic, index) => (
                    <div key={index} className="topic-item">
                      <div className="topic-importance" 
                        style={{
                          backgroundColor: topic.importance > 7 ? '#fee2e2' : 
                                          topic.importance > 4 ? '#fef3c7' : '#d1fae5'
                        }}>
                        {topic.importance}
                      </div>
                      <div className="topic-details">
                        <h5>{topic.title || topic.name}</h5>
                        {topic.context && (
                          <p className="topic-context">{topic.context.substring(0, 100)}...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Important Dates Section */}
        <div className="summary-section">
          <div 
            className="section-header" 
            onClick={() => toggleSection('dates')}
          >
            {expandedSections.dates ? <FiChevronDown /> : <FiChevronRight />}
            <h4>Important Dates ({document.extractedData.dates.length})</h4>
          </div>
          
          {expandedSections.dates && (
            <div className="section-content">
              {document.extractedData.dates.length === 0 ? (
                <p className="no-data-message">No dates detected</p>
              ) : (
                <div className="dates-list">
                  {document.extractedData.dates.map((date, index) => (
                    <div key={index} className="date-item">
                      <div className="date-icon">
                        <FiCalendar />
                      </div>
                      <div className="date-details">
                        <div className="date-value">{date.date}</div>
                        <div className="date-context">{date.context}</div>
                        {date.isDeadline && (
                          <div className="date-tag deadline">Deadline</div>
                        )}
                        {date.isExam && (
                          <div className="date-tag exam">Exam</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFSummary;
