import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL || 'https://mi-api.com', 
  timeout: 8000
});

// // Interceptor para agregar token automáticamente
// api.interceptors.request.use(config => {
//   const token = process.env.API_TOKEN || null;
  
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   return config;
// });

// // Interceptor de respuestas para manejar errores globalmente
// api.interceptors.response.use(
//   response => response,
//   error => {
//     console.error('API error:', error.response?.data || error.message);
//     // Puedes agregar lógica como refresh token, logout, etc.
//     return Promise.reject(error);
//   }
// );

export default api;
