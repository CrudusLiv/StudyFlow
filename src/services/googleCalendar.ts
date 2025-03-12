// This is a simplified version that doesn't actually connect to Google Calendar

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

class GoogleCalendarService {
  async initialize(): Promise<boolean> {
    // Always return false to indicate Google Calendar is not available
    return false;
  }

  async createEvent(): Promise<any> {
    throw new Error('Google Calendar integration is disabled');
  }

  async getEvents(): Promise<GoogleEvent[]> {
    // Return empty array as we don't use Google Calendar
    return [];
  }

  isConnected(): boolean {
    // Always return false
    return false;
  }
}

export const googleCalendarService = new GoogleCalendarService();
