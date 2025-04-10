import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const AdminDebug: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { userRole } = useAuth();
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Store the raw response data
      setData(response.data);
      setRawResponse(JSON.stringify(response.data, null, 2));
      
      console.log('AdminDebug: Using auth token:', token?.substring(0, 20) + '...');
      console.log('AdminDebug: Full raw response data structure:', response.data);
      
      // Analyze user data structure
      if (response.data?.userData) {
        const userData = response.data.userData;
        console.log(`AdminDebug: Found ${userData.length} users`);
        
        if (userData.length > 0) {
          const firstUser = userData[0];
          console.log('AdminDebug: First user data:', firstUser);
          console.log('AdminDebug: User fields available:', Object.keys(firstUser));
          console.log('AdminDebug: Has sessionDurations:', 
            Array.isArray(firstUser.sessionDurations),
            firstUser.sessionDurations?.length || 0);
          console.log('AdminDebug: Has loginHistory:', 
            Array.isArray(firstUser.loginHistory),
            firstUser.loginHistory?.length || 0);
          console.log('AdminDebug: Last login value:', firstUser.lastLogin);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics data');
      console.error('AdminDebug: Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Only render for admins in development
  if (userRole !== 'admin' || !import.meta.env.DEV) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 10000,
      maxWidth: '600px',
      maxHeight: '80vh',
      overflow: 'auto',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h3>Admin API Debug</h3>
      
      <button 
        onClick={fetchData}
        style={{
          padding: '5px 10px',
          marginBottom: '10px',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Test Admin API'}
      </button>
      
      {error && (
        <div style={{ color: '#ef4444', marginBottom: '10px' }}>
          Error: {error}
        </div>
      )}
      
      {data && (
        <div>
          <div>
            <strong>Analytics Summary:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Total Users: {data.userCount || 0}</li>
              <li>Active Today: {data.activeToday || 0}</li>
              <li>Avg Session: {Math.round(data.averageSessionDuration || 0)}m</li>
            </ul>
          </div>
          
          <div>
            <strong>Auth Method Check:</strong>
            <button
              onClick={() => {
                const token = localStorage.getItem('token');
                if (token) {
                  const payload = token.split('.')[1];
                  const decoded = JSON.parse(atob(payload));
                  console.log('Token payload:', decoded);
                  alert(`Auth provider: ${decoded.provider || 'unknown'}\nUser ID: ${decoded.userId || decoded.id || 'unknown'}`);
                } else {
                  alert('No token found');
                }
              }}
              style={{
                padding: '2px 5px',
                marginLeft: '10px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Check Auth
            </button>
          </div>
          
          <details open>
            <summary style={{ cursor: 'pointer', marginTop: '10px' }}>
              <strong>User Data Preview:</strong>
            </summary>
            {data.userData && Array.isArray(data.userData) && data.userData.length > 0 ? (
              <div>
                {data.userData.map((user: any, index: number) => (
                  <details key={user._id || index}>
                    <summary style={{ cursor: 'pointer', marginTop: '5px' }}>
                      {user.name || 'Unknown'} ({user.email})
                    </summary>
                    <div style={{ paddingLeft: '10px', fontSize: '10px' }}>
                      <div>Role: {user.role || 'user'}</div>
                      <div>Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</div>
                      <div>Total Sessions: {user.sessionDurations?.length || '0'}</div>
                      <div>Session Data: {Array.isArray(user.sessionDurations) ? 'Present' : 'Missing'}</div>
                      <div>Login History: {Array.isArray(user.loginHistory) ? user.loginHistory.length : 'Missing'}</div>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div style={{ color: '#ef4444' }}>No user data available</div>
            )}
          </details>
          
          <details>
            <summary style={{ cursor: 'pointer', color: '#3b82f6', marginTop: '10px' }}>
              View Complete Raw API Response
            </summary>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: '10px',
              maxHeight: '200px',
              overflow: 'auto',
              background: '#111',
              padding: '5px',
              marginTop: '5px',
              border: '1px solid #333',
              borderRadius: '3px'
            }}>
              {rawResponse}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default AdminDebug;
