import { useGoogleLogin } from '@react-oauth/google';
import React from 'react';

interface AccessGoogleButtonProps {
  onSuccess: (token: string) => void;
  onError: (error: Error | unknown) => void;
}

export const AccessGoogleButton: React.FC<AccessGoogleButtonProps> = ({ onSuccess, onError }) => {
  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      try {
        console.log('Google login successful, token received');
        // Don't store as googleAccessToken since we're not using it for calendar
        localStorage.setItem('googleToken', tokenResponse.access_token);
        onSuccess(tokenResponse.access_token);
      } catch (error) {
        console.error('Failed to store Google token:', error);
        onError(error);
      }
    },
    onError: error => {
      console.error('Google login failed:', error);
      onError(error);
    },
    // Remove calendar scopes since we're not using them
    flow: 'implicit'
  });

  return (
    <button 
      onClick={() => login()}
      className="google-access-button"
      type="button"
    >
      Sign in with Google
    </button>
  );
};
