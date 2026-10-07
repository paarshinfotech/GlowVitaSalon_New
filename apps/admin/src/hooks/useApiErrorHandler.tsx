"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAppSelector } from '@repo/store/hooks';

/**
 * Global error handler for API responses
 * Shows user-friendly toast messages for common errors
 */
export function useApiErrorHandler() {
  const { isAdminAuthenticated } = useAppSelector((state: any) => state.adminAuth);

  useEffect(() => {
    // Intercept fetch responses globally
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      let response;
      let method = 'GET';

      if (args[0] instanceof Request) {
        method = args[0].method.toUpperCase();
      } else if (typeof args[0] === 'string' || args[0] instanceof URL) {
        method = (args[1]?.method || 'GET').toUpperCase();
      }

      try {
        response = await originalFetch(...args);
      } catch (error) {
        // ACTUAL Network error (connection refused, timeout, etc.)
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Fetch network error:', error);
          toast.error('Connection Error', {
            description: 'Please check your internet connection and try again.',
            id: 'global-api-error',
            duration: 4000,
          });
        }
        throw error;
      }

      // If we reach here, originalFetch returned a response (could be 200, 403, 500, etc.)
      if (!response.ok) {
        try {
          const clonedResponse = response.clone();
          const contentType = response.headers.get('content-type');

          let data: any = {};
          if (contentType && contentType.includes('application/json')) {
            try {
              data = await clonedResponse.json();
            } catch (e) { /* ignore */ }
          }

          const message = data.message || data.error;

          // Handle specific status codes
          if (response.status === 403) {
            // Only show 403 toast for non-GET requests (mutations/actions)
            // For GET requests, the AdminLayout will handle redirects if permission is missing
            if (method !== 'GET') {
              toast.error('Permission Denied', {
                description: message || 'You do not have permission to perform this action.',
                id: 'global-api-error',
                duration: 5000,
              });
            }
          } else if (response.status === 401) {
            toast.error('Session Expired', {
              description: 'Your session has expired. Please login again.',
              id: 'global-api-error',
              duration: 5000,
            });
          } else if (response.status === 500) {
            toast.error('Server Error', {
              description: message || 'An unexpected error occurred on the server.',
              id: 'global-api-error',
              duration: 5000,
            });
          } else if (response.status !== 404) { // Ignore 404s to avoid excessive noise
            toast.error('Error', {
              description: message || `Request failed with status ${response.status}`,
              id: 'global-api-error',
              duration: 4000,
            });
          }
        } catch (error) {
          console.error('Error in fetch interceptor:', error);
        }
      }

      return response;
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, [isAdminAuthenticated]);

  return null;
}
