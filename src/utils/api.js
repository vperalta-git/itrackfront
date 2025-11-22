import { buildApiUrl } from '../config/api';

/**
 * Generic API fetch utility with error handling
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options (method, headers, body)
 * @returns {Promise<object>} Response data
 */
export const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
};

/**
 * GET request
 */
export const apiGet = async (endpoint) => {
  return apiFetch(buildApiUrl(endpoint), { method: 'GET' });
};

/**
 * POST request
 */
export const apiPost = async (endpoint, body) => {
  return apiFetch(buildApiUrl(endpoint), {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * PUT request
 */
export const apiPut = async (endpoint, body) => {
  return apiFetch(buildApiUrl(endpoint), {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

/**
 * DELETE request
 */
export const apiDelete = async (endpoint) => {
  return apiFetch(buildApiUrl(endpoint), { method: 'DELETE' });
};

export default {
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
};
