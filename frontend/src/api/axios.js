import axios from "axios";
import config from "../config";

const api = axios.create({
  baseURL: config.apiBASEURL,
  withCredentials: true, // sends httpOnly cookies
});

// Utility function to read user_type from session storage
const getUserType = () => {
  const role = sessionStorage.getItem("role");
  return role === "Client" ? "Client" : undefined;
};

// Interceptor to handle 403 and retry after refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Prevent retry loop and ignore refresh-token request itself
    const isRefreshRequest = originalRequest.url.includes(
      "/AuthRoutes/refresh-token"
    );

    if (
      error.response?.status === 403 &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      try {
        const user_type = getUserType();
        const query = user_type ? `?user_type=${user_type}` : "";

        await api.post(`/AuthRoutes/refresh-token${query}`);
        return api(originalRequest);
      } catch (err) {
        console.error("Token refresh failed:", err);
        return Promise.reject(err); // Exit the loop if refresh fails
      }
    }

    return Promise.reject(error);
  }
);

export default api;
