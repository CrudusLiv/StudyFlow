import React, { useState } from 'react';
import PDFSummary from './PDFSummary';
import ScheduleInsights from './ScheduleInsights';
import EventsGrid from './EventsGrid';
import { FiFileText, FiCalendar, FiGrid, FiList, FiBarChart2 } from 'react-icons/fi';
import '../styles/components/PDFUploadResults.css';

interface PDFUploadResultsProps {
  documents: Array<{
    title: string;
    fileName: string;
    extractedData: any;
  }>;
  schedule: any[];
  onScheduleEdit?: () => void;
}

const PDFUploadResults: React.FC<PDFUploadResultsProps> = ({ 
  documents, 
  schedule,
  onScheduleEdit
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'schedule' | 'insights'>('schedule');

  return (
    <div className="pdf-results">
      <div className="pdf-results-header">
        <h2>PDF Processing Results</h2>
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FiFileText className="tab-icon" />
            Documents ({documents.length})
          </button>
          <button 
            className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <FiCalendar className="tab-icon" />
            Schedule ({schedule.length})
          </button>
          <button 
            className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            <FiBarChart2 className="tab-icon" />
            Insights
          </button>
        </div>
      </div>

      <div className="pdf-results-content">
        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="documents-tab">
            {documents.length === 0 ? (
              <div className="no-data">
                <FiFileText className="no-data-icon" />
                <p>No documents processed</p>
              </div>
            ) : (
              <div className="documents-list">
                {documents.map((doc, index) => (
                  <PDFSummary key={index} document={doc} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="schedule-tab">
            {schedule.length === 0 ? (
              <div className="no-data">
                <FiCalendar className="no-data-icon" />
                <p>No schedule generated</p>
              </div>
            ) : (
              <div className="schedule-content">
                <div className="schedule-controls">
                  <h3>Generated Study Schedule</h3>
                  {onScheduleEdit && (
                    <button className="edit-schedule-button" onClick={onScheduleEdit}>
                      Edit Schedule
                    </button>
                  )}
                </div>
                <EventsGrid events={schedule} />
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="insights-tab">
            {schedule.length === 0 ? (
              <div className="no-data">
                <FiBarChart2 className="no-data-icon" />
                <p>No data available for insights</p>
              </div>
            ) : (
              <ScheduleInsights schedule={schedule} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFUploadResults;
