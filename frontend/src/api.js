// API client helper for sending requests to the Django REST backend.
// Automatically adds JWT authorization headers and handles JSON responses and errors.

const API_BASE = '/api';

// Retrieve stored authentication tokens from browser storage
export function getStoredTokens() {
  const access = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  return { access, refresh };
}

// Save authentication tokens to browser storage
export function setStoredTokens(access, refresh) {
  if (access) {
    localStorage.setItem('access_token', access);
  } else {
    localStorage.removeItem('access_token');
  }

  if (refresh) {
    localStorage.setItem('refresh_token', refresh);
  } else {
    localStorage.removeItem('refresh_token');
  }
}

// Clear all authentication tokens on logout
export function clearStoredTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// Extract a readable error message from Django REST Framework error responses
export function extractErrorMessage(errorData, fallback = 'An unexpected error occurred.') {
  if (!errorData) {
    return fallback;
  }

  if (typeof errorData === 'string') {
    return errorData;
  }

  if (errorData.detail) {
    return String(errorData.detail);
  }

  if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
    return errorData.non_field_errors.join(' ');
  }

  // Combine field-specific errors into a single readable string
  const fieldMessages = [];
  for (const [key, val] of Object.entries(errorData)) {
    const fieldName = key.replace('_', ' ');
    if (Array.isArray(val)) {
      fieldMessages.push(`${fieldName}: ${val.join(' ')}`);
    } else if (typeof val === 'string') {
      fieldMessages.push(`${fieldName}: ${val}`);
    }
  }

  if (fieldMessages.length > 0) {
    return fieldMessages.join(' | ');
  }

  return fallback;
}

// Core fetch wrapper that attaches the JWT Bearer token to each request
export async function apiRequest(endpoint, options = {}) {
  const { access } = getStoredTokens();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (access) {
    headers['Authorization'] = `Bearer ${access}`;
  }

  const config = {
    ...options,
    headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, config);

  if (response.status >= 500 && response.status < 600 && typeof window !== 'undefined') {
    if (window.location.pathname !== '/500') {
      window.location.assign('/500');
    }
  }

  // If unauthorized and we have a refresh token, try refreshing the access token once
  if (response.status === 401 && !options._isRetry) {
    const { refresh } = getStoredTokens();
    if (refresh) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setStoredTokens(refreshData.access, refresh);

          // Retry the original request with the new access token
          return apiRequest(endpoint, {
            ...options,
            _isRetry: true,
          });
        }
      } catch {
        // Token refresh failed, continue to standard error handling
      }
    }
  }

  // Parse JSON response or handle empty body
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = extractErrorMessage(data, `Request failed with status ${response.status}`);
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Convenience methods for common HTTP verbs
export const api = {
  get: (endpoint, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (endpoint, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

// Upload a single photo file with granular XMLHttpRequest upload progress
export function uploadPhotoWithProgress(eventId, file, onProgress) {
  return new Promise((resolve, reject) => {
    const { access } = getStoredTokens();
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('files', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        let errorMsg = 'Failed to upload photo.';
        try {
          const errData = JSON.parse(xhr.responseText);
          errorMsg = extractErrorMessage(errData, errorMsg);
        } catch {
          // ignore parsing error
        }
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred during upload.'));
    });

    xhr.open('POST', `${API_BASE}/events/${eventId}/photos/`);
    if (access) {
      xhr.setRequestHeader('Authorization', `Bearer ${access}`);
    }
    xhr.send(formData);
  });
}

// Download selected photos packaged into a zip file
export async function downloadEventPhotosZip(eventId, photoIds) {
  const { access } = getStoredTokens();
  const response = await fetch(`${API_BASE}/events/${eventId}/download/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body: JSON.stringify({ photo_ids: photoIds }),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to download zip archive.';
    try {
      const errData = await response.json();
      errorMsg = extractErrorMessage(errData, errorMsg);
    } catch {
      // ignore parsing error
    }
    throw new Error(errorMsg);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;

  const disposition = response.headers.get('content-disposition');
  let filename = 'photos.zip';
  if (disposition && disposition.includes('filename=')) {
    filename = disposition.split('filename=')[1].replace(/["']/g, '').trim();
  }

  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}

export default api;
