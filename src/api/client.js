import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_URL,
});

// Caché en memoria del cliente + deduplicación de peticiones en vuelo
const getCache = new Map();
const inFlightRequests = new Map();
const CLIENT_CACHE_TTL_MS = 30 * 1000; // 30 segundos

export function limpiarCacheCliente() {
  getCache.clear();
  inFlightRequests.clear();
}

// Sesión aislada por pestaña (sessionStorage) para poder operar varios perfiles a la vez
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('siae_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta: detecta JWT expirado o inválido (HTTP 401) y cierra sesión de forma segura
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || '');
    if (status === 401 && !url.includes('/auth/login')) {
      limpiarCacheCliente();
      sessionStorage.removeItem('siae_token');
      sessionStorage.removeItem('siae_usuario');
      window.dispatchEvent(new CustomEvent('siae:sesion-expirada'));
    }
    return Promise.reject(error);
  }
);

const rawGet = api.get.bind(api);
const rawPost = api.post.bind(api);
const rawPut = api.put.bind(api);
const rawPatch = api.patch.bind(api);
const rawDelete = api.delete.bind(api);

function construirCacheKey(url, config = {}) {
  const token = sessionStorage.getItem('siae_token') || 'anon';
  const paramsStr = config.params ? JSON.stringify(config.params) : '';
  return `${token.slice(-16)}:${url}:${paramsStr}`;
}

api.get = async (url, config = {}) => {
  // No cachear descargas binarias (blob) ni buzón de notificaciones en tiempo real
  if (config.responseType === 'blob' || String(url).includes('/notificaciones')) {
    return rawGet(url, config);
  }

  const key = construirCacheKey(url, config);
  const ahora = Date.now();
  const cached = getCache.get(key);

  if (cached && ahora < cached.expiresAt) {
    return Promise.resolve(cached.response);
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const reqPromise = rawGet(url, config)
    .then((response) => {
      getCache.set(key, {
        response,
        expiresAt: Date.now() + CLIENT_CACHE_TTL_MS,
      });
      inFlightRequests.delete(key);
      return response;
    })
    .catch((err) => {
      inFlightRequests.delete(key);
      throw err;
    });

  inFlightRequests.set(key, reqPromise);
  return reqPromise;
};

api.post = async (...args) => {
  limpiarCacheCliente();
  return rawPost(...args);
};

api.put = async (...args) => {
  limpiarCacheCliente();
  return rawPut(...args);
};

api.patch = async (...args) => {
  limpiarCacheCliente();
  return rawPatch(...args);
};

api.delete = async (...args) => {
  limpiarCacheCliente();
  return rawDelete(...args);
};

export default api;
