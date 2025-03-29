import { useState, useEffect } from 'react';

/**
 * A hook that returns whether the current viewport matches the given media query
 * @param query The media query to check
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if window exists (for SSR)
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      
      // Initial check
      setMatches(media.matches);
      
      // Update the state when matches changes
      const listener = () => setMatches(media.matches);
      
      // Modern browsers
      if (media.addEventListener) {
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
      } 
      // Legacy support
      else {
        media.addListener(listener);
        return () => media.removeListener(listener);
      }
    }
    
    // Default to false for SSR
    return () => {};
  }, [query]);

  return matches;
}

// Convenience hooks for common breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}
