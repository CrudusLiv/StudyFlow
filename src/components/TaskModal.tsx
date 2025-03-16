import React from 'react';
import { ScheduleTask } from '../types/types';

interface TaskModalProps {
  task: ScheduleTask;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: ScheduleTask) => void;
  onDelete: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, isOpen, onClose, onSave, onDelete }) => {
  const [editedTask, setEditedTask] = React.useState<ScheduleTask>(task);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="task-modal">
        <div className="modal-header">
          <h2>Task Details</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={editedTask.title}
              onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Time</label>
            <input
              type="text"
              value={editedTask.time}
              onChange={e => setEditedTask({ ...editedTask, time: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Details</label>
            <textarea
              value={editedTask.details}
              onChange={e => setEditedTask({ ...editedTask, details: e.target.value })}
              className="form-input"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select
              value={editedTask.priority}
              onChange={e => setEditedTask({ ...editedTask, priority: e.target.value as 'high' | 'medium' | 'low' })}
              className="form-input"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={editedTask.status}
              onChange={e => setEditedTask({ ...editedTask, status: e.target.value as 'pending' | 'in-progress' | 'completed' })}
              className="form-input"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="delete-button" onClick={onDelete}>Delete Task</button>
          <div className="action-buttons">
            <button className="cancel-button" onClick={onClose}>Cancel</button>
            <button className="save-button" onClick={() => onSave(editedTask)}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
