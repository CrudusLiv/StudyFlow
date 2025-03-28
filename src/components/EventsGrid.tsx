import React, { useState } from 'react';
import EventCard from './EventCard';
import EventDetailsModal from './EventDetailsModal';
import { FiFilter, FiChevronDown, FiPlus } from 'react-icons/fi';
import '../styles/components/EventsGrid.css';

interface EventsGridProps {
  events: any[];
  onAddEvent?: () => void;
}

const EventsGrid: React.FC<EventsGridProps> = ({ events, onAddEvent }) => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'category'>('date');

  // Event handlers
  const handleViewDetails = (event: any) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
  };

  // Filtering logic
  const filteredEvents = events.filter((event) => {
    if (filterCategory !== 'all' && event.category !== filterCategory) {
      return false;
    }
    if (filterPriority !== 'all' && event.priority !== filterPriority) {
      return false;
    }
    return true;
  });

  // Sorting logic
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    } else if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    } else if (sortBy === 'category') {
      return (a.category || '').localeCompare(b.category || '');
    }
    return 0;
  });

  // Categories for filter
  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'class', name: 'Class Sessions' },
    { id: 'study', name: 'Study Sessions' },
    { id: 'topic-study', name: 'Topic Study' },
    { id: 'knowledge-check', name: 'Knowledge Checks' },
    { id: 'revision', name: 'Revision Sessions' },
    { id: 'practice', name: 'Practice Sessions' },
    { id: 'milestone', name: 'Milestones' }
  ];

  // Priorities for filter
  const priorities = [
    { id: 'all', name: 'All Priorities' },
    { id: 'high', name: 'High Priority' },
    { id: 'medium', name: 'Medium Priority' },
    { id: 'low', name: 'Low Priority' }
  ];

  // Sort options
  const sortOptions = [
    { id: 'date', name: 'Date' },
    { id: 'priority', name: 'Priority' },
    { id: 'category', name: 'Category' }
  ];

  return (
    <div className="events-grid-container">
      {/* Filters and sorting */}
      <div className="events-grid-actions">
        <div className="filter-section">
          <div className="filter-icon-container">
            <FiFilter className="filter-icon" />
          </div>
          
          <div className="filter-dropdown">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          
          <div className="filter-dropdown">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="filter-select"
            >
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
                </option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
        </div>
        
        <div className="sort-section">
          <span className="sort-label">Sort by:</span>
          <div className="filter-dropdown">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'category')}
              className="filter-select"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
        </div>
        
        {onAddEvent && (
          <button className="add-event-button" onClick={onAddEvent}>
            <FiPlus className="add-icon" />
            Add Event
          </button>
        )}
      </div>
      
      {/* Events grid */}
      <div className="events-grid">
        {sortedEvents.length === 0 ? (
          <div className="no-events-message">
            <p>No events found matching your filters</p>
          </div>
        ) : (
          sortedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onViewDetails={handleViewDetails}
            />
          ))
        )}
      </div>
      
      {/* Event details modal */}
      {showDetailsModal && selectedEvent && (
        <EventDetailsModal 
          event={selectedEvent} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
};

export default EventsGrid;
