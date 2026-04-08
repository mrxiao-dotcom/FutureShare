'use client';

/**
 * 认证状态 Hook
 */

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  userType: string;
  isAdmin: boolean;
  status: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // 从 localStorage 初始化
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUserId = localStorage.getItem('user_id');
    const storedUserName = localStorage.getItem('user_name');
    const storedIsAdmin = localStorage.getItem('is_admin');

    if (storedToken && storedUserId) {
      setToken(storedToken);
      setUser({
        id: storedUserId,
        name: storedUserName || '',
        email: '',
        userType: 'JUNIOR',
        isAdmin: storedIsAdmin === 'true',
        status: 'ACTIVE',
      });
    }
    setLoading(false);
  }, []);

  // 登录
  const login = useCallback((newToken: string, userData: User) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('user_id', userData.id);
    localStorage.setItem('user_name', userData.name);
    localStorage.setItem('is_admin', userData.isAdmin ? 'true' : 'false');
    setToken(newToken);
    setUser(userData);
  }, []);

  // 登出
  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('is_admin');
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, loading, login, logout };
}
