import { createContext, useContext, useEffect, useState, useCallback } from "react";
import apiClient from "../api/axiosClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/auth/me");
      setUser(data.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Runs once on mount — this is what makes the app "usable after refresh":
  // the access token lives in an httpOnly cookie the browser already sent,
  // so /auth/me silently restores the session without the user re-entering
  // anything.
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    setUser(data.data.user);
    return data.data.user;
  };

  const register = async ({ name, email, password, collegeCode }) => {
    const { data } = await apiClient.post("/auth/register", {
      name,
      email,
      password,
      ...(collegeCode ? { collegeCode } : {}),
    });
    return data.data.user;
  };

  const logout = async () => {
    await apiClient.post("/auth/logout");
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    await apiClient.post("/auth/change-password", { currentPassword, newPassword });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, changePassword, refetch: fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}