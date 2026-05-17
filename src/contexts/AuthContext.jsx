import { createContext, useContext, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'mikveh_jwt';

const AuthContext = createContext(null);

function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.userId,
      mikveh_id: payload.mikveh_id,
      role: payload.role,
    };
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(getUserFromToken(localStorage.getItem(TOKEN_KEY)));
  const [error, setError] = useState(null);

  useEffect(() => {
    const parsedUser = getUserFromToken(token);
    setUser(parsedUser);
    if (!parsedUser) {
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  const login = async (username, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Login failed');
    }

    const { token: newToken } = await response.json();
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  };

  const authFetch = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      logout();
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
