// src/config.js
const config = {
  // Use environment variable with fallback for development
  apiBASEURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:7072",
};

export default config;
