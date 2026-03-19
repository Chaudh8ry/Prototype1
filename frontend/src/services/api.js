import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050'}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('innerverse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('innerverse_token');
      localStorage.removeItem('innerverse_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (email, password, first_name, last_name) => 
    api.post('/auth/register', { email, password, first_name, last_name }),
  
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
};

// Profile API calls
export const profileAPI = {
  saveProfile: (profileData) => 
    api.post('/profile', profileData),
  
  getProfile: () => 
    api.get('/profile'),

  getProfiles: () =>
    api.get('/profile'),

  setActiveProfile: (profileId) =>
    api.post(`/profile/active/${profileId}`),

  deleteProfile: (profileId) =>
    api.delete(`/profile/${profileId}`),
};

// Analysis API calls
export const analysisAPI = {
  extractIngredients: (imageFiles) => {
    const formData = new FormData();
    imageFiles.forEach((imageFile) => {
      formData.append('images', imageFile);
    });
    
    return api.post('/analysis/extract-ingredients', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  analyzeIngredients: (scannedIngredientsList, productName, nutritionTable = {}, profileId = null) => 
    api.post('/analysis/analyze-ingredients', {
      scanned_ingredients_list: scannedIngredientsList,
      scanned_nutrition_table: nutritionTable,
      product_name: productName,
      ...(profileId ? { profile_id: profileId } : {}),
    }),

  getInsights: (profileId = null) =>
    api.get('/analysis/insights', {
      params: profileId ? { profile_id: profileId } : {},
    }),
  
  getIngredient: (ingredientName) => 
    api.get(`/analysis/ingredient/${encodeURIComponent(ingredientName)}`),
};

// Scans API calls
export const scansAPI = {
  saveScan: (productName, analysisResult, overallRating, nutritionTableData = {}, profileId = null) =>
    api.post('/scans', {
      product_name: productName,
      analysis_result: analysisResult,
      overall_rating: overallRating,
      nutrition_table_data: nutritionTableData,
      ...(profileId ? { profile_id: profileId } : {}),
    }),
  
  getScans: (profileId = null) =>
    api.get('/scans', {
      params: profileId ? { profile_id: profileId } : {},
    }),
  
  getScan: (scanId) =>
    api.get(`/scans/${scanId}`),
  
  deleteScan: (scanId) =>
    api.delete(`/scans/${scanId}`),
};

// Helper functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('innerverse_token', token);
  } else {
    localStorage.removeItem('innerverse_token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('innerverse_token');
};

export const setUser = (user) => {
  if (user) {
    localStorage.setItem('innerverse_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('innerverse_user');
  }
};

export const getUser = () => {
  const user = localStorage.getItem('innerverse_user');
  return user ? JSON.parse(user) : null;
};

export const logout = () => {
  localStorage.removeItem('innerverse_token');
  localStorage.removeItem('innerverse_user');
};

export default api;

