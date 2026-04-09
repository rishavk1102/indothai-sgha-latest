// middleware/authMiddleware.js

// middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET; // Make sure this is correctly set in your .env file

// Middleware to protect routes — verifies access JWT from httpOnly cookie
const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    // 403 so the axios client can attempt refresh-token (see frontend api/axios.js)
    return res.status(403).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
