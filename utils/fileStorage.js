import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const SCHEDULES_DIR = path.join(STORAGE_DIR, 'schedules');

/**
 * Initialize storage directories
 */
export function initializeStorage() {
  // Create storage directories if they don't exist
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    console.log('Created main storage directory');
  }
  
  if (!fs.existsSync(SCHEDULES_DIR)) {
    fs.mkdirSync(SCHEDULES_DIR, { recursive: true });
    console.log('Created schedules storage directory');
  }
}

/**
 * Save a generated schedule to a file
 * @param {string} userId - User ID
 * @param {Array} schedule - Generated schedule
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Result with scheduleId
 */
export function saveSchedule(userId, schedule, metadata = {}) {
  try {
    initializeStorage();
    
    // Create user directory if it doesn't exist
    const userDir = path.join(SCHEDULES_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Generate a unique ID for this schedule
    const scheduleId = metadata.scheduleId || uuidv4();
    
    // Create a data object with the schedule and metadata
    const scheduleData = {
      id: scheduleId,
      userId,
      schedule,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        fileCount: metadata.fileCount || 0,
        assignmentCount: schedule.filter(item => 
          item.category === 'assignment' || 
          item.category === 'study'
        ).length,
        classCount: schedule.filter(item => 
          item.category === 'class'
        ).length
      }
    };
    
    // Save to file
    const filePath = path.join(userDir, `${scheduleId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(scheduleData, null, 2));
    
    console.log(`Saved schedule ${scheduleId} for user ${userId}`);
    
    return {
      success: true,
      scheduleId,
      filePath
    };
  } catch (error) {
    console.error('Error saving schedule to file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Load a schedule by ID and user ID
 * @param {string} userId - User ID
 * @param {string} scheduleId - Schedule ID
 * @returns {Object|null} - Loaded schedule or null if not found
 */
export function loadSchedule(userId, scheduleId) {
  try {
    const filePath = path.join(SCHEDULES_DIR, userId, `${scheduleId}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Schedule ${scheduleId} not found for user ${userId}`);
      return null;
    }
    
    const scheduleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Convert string dates back to Date objects
    if (scheduleData.schedule && Array.isArray(scheduleData.schedule)) {
      scheduleData.schedule = scheduleData.schedule.map(item => ({
        ...item,
        start: item.start ? new Date(item.start) : undefined,
        end: item.end ? new Date(item.end) : undefined
      }));
    }
    
    return scheduleData;
  } catch (error) {
    console.error('Error loading schedule from file:', error);
    return null;
  }
}

/**
 * Get all schedules for a user
 * @param {string} userId - User ID
 * @returns {Array} - Array of schedule metadata
 */
export function getUserSchedules(userId) {
  try {
    const userDir = path.join(SCHEDULES_DIR, userId);
    
    if (!fs.existsSync(userDir)) {
      return [];
    }
    
    const files = fs.readdirSync(userDir)
      .filter(file => file.endsWith('.json'));
    
    const schedules = files.map(file => {
      try {
        const filePath = path.join(userDir, file);
        const scheduleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Return just the metadata for listing
        return {
          id: scheduleData.id,
          createdAt: scheduleData.metadata?.createdAt,
          assignmentCount: scheduleData.metadata?.assignmentCount || 0,
          classCount: scheduleData.metadata?.classCount || 0,
          title: scheduleData.metadata?.title || 'Untitled Schedule',
          fileCount: scheduleData.metadata?.fileCount || 0
        };
      } catch (e) {
        console.error(`Error parsing schedule file ${file}:`, e);
        return null;
      }
    }).filter(Boolean);
    
    // Sort by creation date, newest first
    return schedules.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting user schedules:', error);
    return [];
  }
}

/**
 * Delete a schedule
 * @param {string} userId - User ID
 * @param {string} scheduleId - Schedule ID
 * @returns {boolean} - Success indicator
 */
export function deleteSchedule(userId, scheduleId) {
  try {
    const filePath = path.join(SCHEDULES_DIR, userId, `${scheduleId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return false;
  }
}

/**
 * Update a schedule
 * @param {string} userId - User ID
 * @param {string} scheduleId - Schedule ID
 * @param {Array} schedule - Updated schedule
 * @param {Object} metadata - Updated metadata
 * @returns {Object} - Result
 */
export function updateSchedule(userId, scheduleId, schedule, metadata = {}) {
  try {
    const filePath = path.join(SCHEDULES_DIR, userId, `${scheduleId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'Schedule not found'
      };
    }
    
    // Load existing data
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update with new data
    const updatedData = {
      ...existingData,
      schedule: schedule || existingData.schedule,
      metadata: {
        ...existingData.metadata,
        ...metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Save updated data
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    
    return {
      success: true,
      scheduleId
    };
  } catch (error) {
    console.error('Error updating schedule:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
