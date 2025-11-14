import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL || 'https://mi-api.com', 
  timeout: 8000,
  withCredentials: true
});

// Interceptor para agregar cookies automáticamente desde el contexto de request
api.interceptors.request.use(config => {
  // Si se pasaron cookies en el contexto de la request, agregarlas
  if (config.cookies) {
    const { accessToken, refreshToken } = config.cookies;
    if (accessToken || refreshToken) {
      const cookieParts = [];
      if (accessToken) cookieParts.push(`accessToken=${accessToken}`);
      if (refreshToken) cookieParts.push(`refreshToken=${refreshToken}`);
      config.headers.Cookie = cookieParts.join('; ');
    }
    // Limpiar el objeto cookies del config (no es parte estándar de axios)
    delete config.cookies;
  }

  return config;
});

// Interceptor de respuestas para manejar errores globalmente
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API error:', error.response?.data || error.message);
    // Puedes agregar lógica como refresh token, logout, etc.
    return Promise.reject(error);
  }
);

export default api;
