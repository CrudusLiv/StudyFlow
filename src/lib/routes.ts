export const ROUTES = {
  HOME: '/',
  ACCESS: '/access',
  SCHEDULE: '/schedule',
  UNIVERSITY_SCHEDULE: '/university-schedule',
  REMINDERS: '/reminders',
  TRACKER: '/tracker',
  ADMIN: '/admin',
  PROFILE: '/profile'
} as const;

export const getRouteTitle = (path: string): string => {
  switch (path) {
    case ROUTES.HOME:
      return 'Home';
    case ROUTES.ACCESS:
      return 'Login / Sign Up';
    case ROUTES.SCHEDULE:
      return 'Study Schedule';
    case ROUTES.UNIVERSITY_SCHEDULE:
      return 'University Schedule';
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
