import { initializeApp } from "firebase/app";
import {
  getAuth,
  OAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const microsoftProvider = new OAuthProvider('microsoft.com');

// Add required scopes
microsoftProvider.addScope('openid');
microsoftProvider.addScope('profile');
microsoftProvider.addScope('email');

// Use localStorage instead of sessionStorage to persist across redirects
microsoftProvider.setCustomParameters({
  prompt: 'select_account',
  tenant: import.meta.env.VITE_MICROSOFT_TENANT_ID,
  // Use relative redirect URI
  redirect_uri: window.location.origin + '/access'
});

export const signInWithMicrosoft = async () => {
  try {
    // Store auth state in localStorage to persist through redirect
    localStorage.setItem('authInProgress', 'true');
    localStorage.setItem('authStartTime', Date.now().toString());
    localStorage.setItem('authReturnUrl', window.location.href);

    console.log('Starting Microsoft auth...', {
      returnUrl: window.location.href,
      provider: microsoftProvider.providerId
    });

    await signInWithRedirect(auth, microsoftProvider);
  } catch (error) {
    console.error('Microsoft auth error:', error);
    clearAuthState();
    throw error;
  }
};

// Add auth state change listener
export const onAuthChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const handleRedirectResult = async () => {
  const authInProgress = localStorage.getItem('authInProgress');
  const startTime = localStorage.getItem('authStartTime');
  const returnUrl = localStorage.getItem('authReturnUrl');

  console.log('Processing redirect...', {
    authInProgress,
    startTime,
    returnUrl,
    currentUrl: window.location.href
  });

  if (!authInProgress) {
    console.log('No auth in progress');
    return null;
  }

  try {
    const result = await getRedirectResult(auth);
    clearAuthState();

    if (result?.user) {
      console.log('Auth successful:', {
        email: result.user.email,
        provider: result.providerId
      });
      return result;
    }

    console.log('No auth result');
    return null;
  } catch (error) {
    console.error('Redirect result error:', error);
    clearAuthState();
    throw error;
  }
};

// Helper to clear auth state
const clearAuthState = () => {
  localStorage.removeItem('authInProgress');
  localStorage.removeItem('authStartTime');
  localStorage.removeItem('authReturnUrl');
};

export { auth };
