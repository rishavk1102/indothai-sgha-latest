// Middleware to throttle submission requests per client
// Prevents spam submissions by limiting requests within a time window

// In-memory store: Map<client_registration_id, lastSubmissionTime>
const submissionTimes = new Map();

// Throttle window in milliseconds (default: 5 seconds)
const THROTTLE_WINDOW_MS = 5000;

/**
 * Middleware to throttle submission requests
 * Prevents clients from submitting multiple times within the throttle window
 */
const submissionThrottle = (req, res, next) => {
  try {
    // Get client_registration_id from request body (since auth is disabled)
    const clientId = req.body?.client_registration_id;

    if (!clientId) {
      // If no client ID, allow request (throttling will be per-IP or skipped)
      return next();
    }

    const now = Date.now();
    const lastSubmission = submissionTimes.get(clientId);

    // Check if client has submitted recently
    if (lastSubmission && (now - lastSubmission) < THROTTLE_WINDOW_MS) {
      const remainingSeconds = Math.ceil((THROTTLE_WINDOW_MS - (now - lastSubmission)) / 1000);
      return res.status(429).json({
        message: `Please wait ${remainingSeconds} second(s) before submitting again.`,
        error: 'Submission throttled',
        retryAfter: remainingSeconds,
      });
    }

    // Update last submission time
    submissionTimes.set(clientId, now);

    // Clean up old entries periodically (optional - prevents memory leak)
    // For production, consider using Redis or a more robust solution
    if (submissionTimes.size > 1000) {
      const cutoffTime = now - THROTTLE_WINDOW_MS * 2;
      for (const [id, time] of submissionTimes.entries()) {
        if (time < cutoffTime) {
          submissionTimes.delete(id);
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error in submission throttle middleware:', error);
    // On error, allow request to proceed (fail open)
    next();
  }
};

module.exports = { submissionThrottle };

