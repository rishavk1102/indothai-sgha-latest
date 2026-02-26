// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { connectSocket, disconnectSocket } from "./socket";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const checkAuthStatus = async () => {
    try {
      const userType = sessionStorage.getItem("role");
      const userTypeParam = userType === "Client" ? "?user_type=Client" : "";

      const response = await api.get(`/AuthRoutes/status${userTypeParam}`);
      console.log(response.data);
      const { isAuthenticated, username, role, userId, roleId, imgUrl } =
        response.data;

      setIsAuthenticated(isAuthenticated);
      setRole(role);
      setRoleId(roleId);
      setUserId(userId);
      setUsername(username);
      setImgUrl(imgUrl);

      // ✅ Connect to socket if not already connected
      if (!socketConnected) {
        try {
          await connectSocket();
          setSocketConnected(true);
        } catch (err) {
          console.warn("⚠️ Socket connection failed");
          setSocketConnected(false);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (authData) => {
    setIsAuthenticated(true);
    setRole(authData.role);
    setRoleId(authData.roleId);
    setUserId(authData.userId);
    setUsername(authData.username);
    setImgUrl(authData.imgUrl);
    // Store the tokens and user details in session storage
    sessionStorage.setItem("role", authData.role);
    sessionStorage.setItem("roleId", authData.roleId);

    // Immediately connect socket on login
    connectSocket()
      .then(() => setSocketConnected(true))
      .catch(() => setSocketConnected(false));
  };

  const logout = async () => {
    try {
      const user_type =
        sessionStorage.getItem("role") === "Client" ? "Client" : "User";

      const res = await api.post(`/AuthRoutes/logout`, {
        userId: userId,
        user_type: user_type,
      });

      if (res.status === 200) {
        try {
          disconnectSocket();
        } catch (e) {
          console.warn("Socket already disconnected");
        }
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Always clear state and session storage, even if API call fails
      try {
        disconnectSocket();
      } catch (e) {
        console.warn("Socket already disconnected");
      }
      setIsAuthenticated(false);
      setRole(null);
      setRoleId(null);
      setUserId(null);
      setUsername(null);
      setImgUrl(null);
      sessionStorage.clear(); // Clear everything from session storage
    }
  };

  useEffect(() => {
    checkAuthStatus();

    const intervalId = setInterval(() => {
      checkAuthStatus();
    }, 30 * 60 * 1000); // every 30 mins

    return () => clearInterval(intervalId);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role,
        roleId,
        userId,
        username,
        login,
        logout,
        loading,
        imgUrl,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
