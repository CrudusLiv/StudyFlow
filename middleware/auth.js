import jwt from 'jsonwebtoken';

export const validateToken = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Simplified token validation - less strict about structure
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_for_development');
    
    // Set user ID with fallbacks to prevent "Invalid token structure" errors
    req.user = {
      id: decoded.id || decoded._id || decoded.userId || decoded.sub,
      email: decoded.email,
      role: decoded.role
    };
    
    // Verify we have a user ID before proceeding
    if (!req.user.id) {
      console.warn('Token missing user ID, using fallback:', decoded);
      // Use a fallback ID if possible rather than rejecting
      if (decoded.sub || decoded.email) {
        req.user.id = decoded.sub || decoded.email.split('@')[0];
      } else {
        return res.status(401).json({ error: 'Unable to identify user from token.' });
      }
    }
    
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};
