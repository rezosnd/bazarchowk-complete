import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  // Try cookie first, then localStorage
  const token = Cookies.get('admin_token') || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
