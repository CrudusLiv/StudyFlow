import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  FiAlertCircle, 
  FiCalendar, 
  FiCheck, 
  FiClock, 
  FiEdit, 
  FiPlus, 
  FiTrash2, 
  FiX 
} from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/pages/Reminders.css';
import { assignmentService } from '../services/assignmentService';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  progress: number;
}

interface Reminder {
  _id: string;
  assignmentId: string | Assignment;
  title: string;
  message: string;
  dueDate: string;
  reminderDate: string;
  isRead: boolean;
}

const Reminders: React.FC = () => {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [virtualReminders, setVirtualReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newAssignment, setNewAssignment] = useState<{
    title: string;
    description: string;
    dueDate: string;
  }>({
    title: '',
    description: '',
    dueDate: formatDateForInput(new Date())
  });

  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showEditForm, setShowEditForm] = useState<boolean>(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      } 
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      toast.error("Your session has expired. Please log in again.");
      navigate('/access?reason=session_expired');
      return;
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const assignmentsData = await assignmentService.getAssignments();
      setAssignments(assignmentsData);

      const authAxios = authService.getAuthAxios();
      const remindersResponse = await authAxios.get('http://localhost:5000/api/reminders');
      setReminders(remindersResponse.data);

      generateVirtualReminders(assignmentsData);

    } catch (error) {
      console.error('Error fetching data:', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
      } else {
        toast.error('Failed to load your assignments and reminders');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateVirtualReminders = (assignmentList: Assignment[]) => {
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    const virtual: Reminder[] = assignmentList
      .filter(assignment => {
        if (assignment.completed) return false;
        
        const dueDate = new Date(assignment.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return dueDate >= today && dueDate <= oneWeekFromNow;
      })
      .map(assignment => {
        return {
          _id: `virtual-${assignment._id}`,
          assignmentId: assignment._id,
          title: `Due Soon: ${assignment.title}`,
          message: `Your assignment "${assignment.title}" is due ${formatRelativeDate(assignment.dueDate)}`,
          dueDate: assignment.dueDate,
          reminderDate: new Date().toISOString(),
          isRead: false
        };
      });
    
    setVirtualReminders(virtual);
  };

  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'tomorrow';
    } else {
      const diffTime = Math.abs(date.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `in ${diffDays} days`;
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!authService.isLoggedIn()) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
        return;
      }

      if (!newAssignment.title || !newAssignment.dueDate) {
        toast.error("Title and due date are required");
        return;
      }

      const dueDate = new Date(newAssignment.dueDate);

      const response = await assignmentService.createAssignment({
        title: newAssignment.title,
        description: newAssignment.description,
        dueDate: dueDate.toISOString()
      });

      setAssignments([...assignments, response]);
      setNewAssignment({
        title: '',
        description: '',
        dueDate: formatDateForInput(new Date())
      });
      setShowAddForm(false);
      toast.success('Assignment added successfully!');

      fetchData();

    } catch (error) {
      console.error('Error adding assignment:', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
      } else {
        toast.error('Failed to add assignment');
      }
    }
  };

  const handleEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingAssignment) return;

    try {
      if (!authService.isLoggedIn()) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
        return;
      }

      const dueDate = new Date(editingAssignment.dueDate);

      const response = await assignmentService.updateAssignment(
        editingAssignment._id, 
        {
          title: editingAssignment.title,
          description: editingAssignment.description,
          dueDate: dueDate.toISOString(),
          completed: editingAssignment.completed,
          progress: editingAssignment.progress
        }
      );

      setAssignments(assignments.map(assignment => 
        assignment._id === editingAssignment._id ? response : assignment
      ));

      setShowEditForm(false);
      setEditingAssignment(null);
      toast.success('Assignment updated successfully!');

      fetchData();

    } catch (error) {
      console.error('Error updating assignment:', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
      } else {
        toast.error('Failed to update assignment');
      }
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This will also delete all associated reminders.')) {
      return;
    }

    try {
      if (!authService.isLoggedIn()) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
        return;
      }

      await assignmentService.deleteAssignment(id);

      setAssignments(assignments.filter(assignment => assignment._id !== id));
      setReminders(reminders.filter(reminder => {
        if (typeof reminder.assignmentId === 'string') {
          return reminder.assignmentId !== id;
        } else {
          return reminder.assignmentId._id !== id;
        }
      }));

      toast.success('Assignment deleted successfully!');

    } catch (error) {
      console.error('Error deleting assignment:', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
      } else {
        toast.error('Failed to delete assignment');
      }
    }
  };

  const handleMarkReminderAsRead = async (id: string) => {
    try {
      if (!authService.isLoggedIn()) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
        return;
      }

      const authAxios = authService.getAuthAxios();
      await authAxios.put(`http://localhost:5000/api/reminders/${id}/mark-read`, {});

      setReminders(reminders.map(reminder => 
        reminder._id === id ? { ...reminder, isRead: true } : reminder
      ));

      toast.success('Reminder marked as read');

    } catch (error) {
      console.error('Error marking reminder as read:', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
      } else {
        toast.error('Failed to update reminder');
      }
    }
  };

  const handleToggleComplete = async (assignment: Assignment) => {
    try {
      if (!authService.isLoggedIn()) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
        return;
      }

      const response = await assignmentService.toggleComplete(assignment);

      setAssignments(assignments.map(a => 
        a._id === assignment._id ? response : a
      ));

      generateVirtualReminders(assignments.map(a => 
        a._id === assignment._id ? response : a
      ));

      toast.success(response.completed 
        ? 'Assignment marked as completed!' 
        : 'Assignment marked as incomplete'
      );

    } catch (error) {
      console.error('Error updating assignment status:', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        navigate('/access?reason=session_expired');
      } else {
        toast.error('Failed to update assignment status');
      }
    }
  };

  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function getStatusClass(dueDate: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);

    const diffTime = dueDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due-today';
    if (diffDays <= 3) return 'upcoming';
    return 'future';
  }

  function getStatusText(dueDate: string): string {
    const statusClass = getStatusClass(dueDate);

    switch (statusClass) {
      case 'overdue': return 'Overdue';
      case 'due-today': return 'Due Today';
      case 'upcoming': return 'Coming Soon';
      default: return 'Upcoming';
    }
  }

  const getAllReminders = (): Reminder[] => {
    const realReminderIds = new Set(reminders.map(r => 
      typeof r.assignmentId === 'string' 
        ? r.assignmentId 
        : r.assignmentId._id
    ));
    
    const filteredVirtual = virtualReminders.filter(vr => 
      !realReminderIds.has(vr.assignmentId as string)
    );
    
    return [...reminders, ...filteredVirtual];
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const sortedReminders = [...getAllReminders()].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime();
  });

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="reminders-container">
      <ToastContainer position="top-right" />

      <header className="reminders-header">
        <div className="title-section">
          <h1><FiClock className="header-icon" /> Reminders & Assignments</h1>
          <p>Keep track of your upcoming tasks and deadlines</p>
        </div>
        <button 
          className="add-button"
          onClick={() => setShowAddForm(true)}
        >
          <FiPlus />
          Add Assignment
        </button>
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your assignments and reminders...</p>
        </div>
      ) : (
        <div className="reminders-content">
          <div className="assignments-section">
            <h2>Your Assignments</h2>

            {sortedAssignments.length === 0 ? (
              <div className="empty-state">
                <FiCalendar className="empty-icon" />
                <p>No assignments yet. Add your first assignment to get started!</p>
              </div>
            ) : (
              <motion.div 
                className="assignments-list"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {sortedAssignments.map(assignment => (
                  <motion.div 
                    key={assignment._id} 
                    className={`assignment-card ${getStatusClass(assignment.dueDate)} ${assignment.completed ? 'completed' : ''}`}
                    variants={itemVariants}
                  >
                    <div className="assignment-header">
                      <div className="assignment-status">
                        <span className="status-dot"></span>
                        <span className="status-text">{getStatusText(assignment.dueDate)}</span>
                      </div>
                      <div className="assignment-actions">
                        <button 
                          className="edit-button"
                          onClick={() => {
                            setEditingAssignment({
                              ...assignment,
                              dueDate: formatDateForInput(new Date(assignment.dueDate))
                            });
                            setShowEditForm(true);
                          }}
                        >
                          <FiEdit / >
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteAssignment(assignment._id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>

                    <h3 className="assignment-title">{assignment.title}</h3>
                    {assignment.description && (
                      <p className="assignment-description">{assignment.description}</p>
                    )}

                    <div className="assignment-meta">
                      <div className="due-date">
                        <FiCalendar />
                        <span>Due: {formatDate(assignment.dueDate)}</span>
                      </div>

                      <button 
                        className={`complete-toggle ${assignment.completed ? 'completed' : ''}`}
                        onClick={() => handleToggleComplete(assignment)}
                      >
                        {assignment.completed ? <FiCheck /> : <FiCircle />}
                        <span>{assignment.completed ? 'Completed' : 'Mark Complete'}</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          <div className="reminders-section">
            <h2>Active Reminders</h2>

            {sortedReminders.length === 0 ? (
              <div className="empty-state">
                <FiAlertCircle className="empty-icon" />
                <p>No active reminders. Reminders appear here for assignments due within a week or when manually created.</p>
              </div>
            ) : (
              <motion.div 
                className="reminders-list"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {sortedReminders.map(reminder => (
                  <motion.div 
                    key={reminder._id} 
                    className={`reminder-card ${reminder.isRead ? 'read' : 'unread'} ${reminder._id.startsWith('virtual-') ? 'auto-generated' : ''}`}
                    variants={itemVariants}
                  >
                    <div className="reminder-header">
                      <div className="reminder-badge">
                        <FiAlertCircle />
                        <span>{reminder.isRead ? 'Read' : 'New'}</span>
                      </div>

                      {!reminder.isRead && (
                        <button 
                          className="mark-read-button"
                          onClick={() => handleMarkReminderAsRead(reminder._id)}
                        >
                          <FiCheck />
                          <span>Mark Read</span>
                        </button>
                      )}
                    </div>

                    <h3 className="reminder-title">{reminder.title}</h3>
                    <p className="reminder-message">{reminder.message}</p>

                    <div className="reminder-meta">
                      <div className="reminder-date">
                        <FiClock />
                        <span>Reminder: {formatDate(reminder.reminderDate)}</span>
                      </div>
                      <div className="due-date">
                        <FiCalendar />
                        <span>Due: {formatDate(reminder.dueDate)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Assignment</h2>
              <button className="close-button" onClick={() => setShowAddForm(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAddAssignment}>
              <div className="form-group">
                <label htmlFor="title">Assignment Title</label>
                <input
                  type="text"
                  id="title"
                  placeholder="Enter assignment title"
                  value={newAssignment.title}
                  onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  placeholder="Enter description"
                  value={newAssignment.description}
                  onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dueDate">Due Date</label>
                <input
                  type="date"
                  id="dueDate"
                  value={newAssignment.dueDate}
                  onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                  min={formatDateForInput(new Date())}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Add Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && editingAssignment && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Assignment</h2>
              <button className="close-button" onClick={() => setShowEditForm(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleEditAssignment}>
              <div className="form-group">
                <label htmlFor="edit-title">Assignment Title</label>
                <input
                  type="text"
                  id="edit-title"
                  placeholder="Enter assignment title"
                  value={editingAssignment.title}
                  onChange={e => setEditingAssignment({...editingAssignment, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Description (Optional)</label>
                <textarea
                  id="edit-description"
                  placeholder="Enter description"
                  value={editingAssignment.description}
                  onChange={e => setEditingAssignment({...editingAssignment, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-dueDate">Due Date</label>
                <input
                  type="date"
                  id="edit-dueDate"
                  value={editingAssignment.dueDate}
                  onChange={e => setEditingAssignment({...editingAssignment, dueDate: e.target.value})}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setShowEditForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Update Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FiCircle = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
  </svg>
);

export default Reminders;
