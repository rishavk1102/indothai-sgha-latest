import api from "../api/axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export const useSessionCheck = (user_type) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth(); // add logout to clear state
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get(`/AuthRoutes/check-session`, {
          params: { user_type },
          withCredentials: true, // important: send cookies
        });

        if (!res.data.valid) {
          logout();
          navigate("/login", { replace: true });
        }
      } catch (error) {
        logout();
        navigate("/login", { replace: true });
      }
    };

    checkSession();
  }, [navigate, user_type, location.pathname, logout]);
};