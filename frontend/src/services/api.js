// Exported so pages that link directly to uploaded media (attachments, evidence photos) build
// that URL from the same source instead of each hardcoding their own copy of the backend origin.
export const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE = `${API_ROOT}/api`;

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};

export const api = {
  get: async (url, token) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, { headers });
    return handleResponse(res);
  },

  post: async (url, body, token, isMultipart = false) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    let reqBody;
    if (isMultipart) {
      reqBody = body; // browser sets boundary for FormData
    } else {
      headers['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: reqBody
    });
    return handleResponse(res);
  },

  patch: async (url, body, token) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  }
};
