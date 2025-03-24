export const ROUTES = {
  HOME: '/',
  ACCESS: '/access',
  SCHEDULE: '/schedule',
  REMINDERS: '/reminders',
  TRACKER: '/tracker',
  ADMIN: '/admin',
  PROFILE: '/profile'
} as const;

export const PROTECTED_ROUTES = {
  [ROUTES.HOME]: { protected: true },
  [ROUTES.ACCESS]: { protected: false },
  [ROUTES.SCHEDULE]: { protected: true },
  [ROUTES.REMINDERS]: { protected: true },
  [ROUTES.TRACKER]: { protected: true },
  [ROUTES.ADMIN]: { protected: true, role: 'admin' },
  [ROUTES.PROFILE]: { protected: true }
} as const;

export const getRouteTitle = (path: string): string => {
  switch (path) {
    case ROUTES.HOME:
      return 'Home';
    case ROUTES.ACCESS:
      return 'Login / Sign Up';
    case ROUTES.SCHEDULE:
      return 'Study Schedule';
    case ROUTES.REMINDERS:
      return 'Reminders';
    case ROUTES.TRACKER:
      return 'Progress Tracker';
    case ROUTES.ADMIN:
      return 'Admin Dashboard';
    case ROUTES.PROFILE:
      return 'Profile';
    default:
      return 'StudyFlow';
  }
};
