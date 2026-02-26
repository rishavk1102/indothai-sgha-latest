// middleware/authMiddleware.js

// middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET; // Make sure this is correctly set in your .env file

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  // Authentication temporarily disabled - allow all requests
  // This allows the drawer and other components to load without strict authentication
  // const token = req.cookies.accessToken;

  // if (token) {
  //   jwt.verify(token, JWT_SECRET, (err, user) => {
  //     if (!err) {
  //       req.user = user; // attach to request if token is valid
  //     }
  //     next();
  //   });
  // } else {
  //   next();
  // }
  
  next();
};

module.exports = { authenticateToken };
