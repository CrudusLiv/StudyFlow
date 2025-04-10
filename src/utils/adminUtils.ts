/**
 * Utility functions for admin data processing
 */

/**
 * Process raw user data from the API into a consistent format
 */
export function processUserData(userData: any[]) {
  return userData.map(user => {
    // Log each individual user for debugging
    console.log('Processing user:', user);
    
    // Create a normalized user object with defaults for missing values
    return {
      _id: user._id || 'unknown-id',
      name: user.name || 'Unknown User',
      email: user.email || 'No Email',
      role: user.role || 'user',
      lastLogin: user.lastLogin || null,
      totalSessions: typeof user.totalSessions === 'number' ? user.totalSessions : 0,
      averageSessionDuration: typeof user.averageSessionDuration === 'number' ? 
        user.averageSessionDuration : 0
    };
  });
}

/**
 * Extract basic analytics from user data
 */
export function extractAnalytics(userData: any[], rawData: any) {
  return {
    totalUsers: rawData.userCount || userData.length || 0,
    activeToday: rawData.activeToday || 0,
    // Ensure we have a number for the average session duration
    averageSessionDuration: typeof rawData.averageSessionDuration === 'number' ? 
      rawData.averageSessionDuration : 0,
    userActivity: userData
  };
}

/**
 * Direct server response handler - bypasses standard processing
 * for troubleshooting data issues
 */
export function directServerResponseHandler(response: any) {
  console.log('Direct response handler received:', response);
  
  // Create a standardized analytics object from the raw response
  const analytics = {
    totalUsers: 0,
    activeToday: 0,
    averageSessionDuration: 0,
    userActivity: []
  };
  
  // Safely extract top-level values with fallbacks
  analytics.totalUsers = response?.userCount || 0;
  analytics.activeToday = response?.activeToday || 0;
  analytics.averageSessionDuration = 
    typeof response?.averageSessionDuration === 'number' ? response.averageSessionDuration : 0;
  
  // Handle different response formats for user data
  const userData = response?.userData || response?.users || [];
  
  // Process user data with careful field access
  if (Array.isArray(userData)) {
    analytics.userActivity = userData.map((rawUser: any) => {
      // Log each user object to see exact structure
      console.log('Raw user data structure:', JSON.stringify(rawUser, null, 2));
      
      // Handle common field name variations
      const userId = rawUser?._id || rawUser?.id || rawUser?.userId || 'unknown';
      const userName = rawUser?.name || rawUser?.displayName || rawUser?.username || 'Unknown';
      
      // Very explicit extraction of each field with type checking
      const user = {
        _id: String(userId),
        name: String(userName),
        email: String(rawUser?.email || 'No Email'),
        role: String(rawUser?.role || 'user'),
        lastLogin: rawUser?.lastLogin || null,
        totalSessions: 0,
        averageSessionDuration: 0
      };
      
      // For login tracking data, use sessionDurations if available 
      // or fallback to loginHistory count
      if (Array.isArray(rawUser?.sessionDurations)) {
        user.totalSessions = rawUser.sessionDurations.length;
        
        // Calculate average session duration if we have sessionDurations
        if (user.totalSessions > 0) {
          const totalDuration = rawUser.sessionDurations.reduce(
            (sum: number, session: any) => sum + (session.duration || 0), 0);
          user.averageSessionDuration = totalDuration / user.totalSessions;
        }
      } else if (Array.isArray(rawUser?.loginHistory)) {
        // Fallback to loginHistory count if sessionDurations not available (e.g. Google users)
        user.totalSessions = rawUser.loginHistory.length;
      }
      
      // If server already calculated averageSessionDuration, use it directly
      if (typeof rawUser?.averageSessionDuration === 'number') {
        user.averageSessionDuration = rawUser.averageSessionDuration;
      }
      
      return user;
    });
  }
  
  console.log('Processed analytics:', analytics);
  return analytics;
}
