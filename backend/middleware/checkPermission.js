const Permission = require('../Models/Permission');
const Page = require('../Models/Page');

// Middleware to check if the user has the required permission on a page
const checkPermission = (action) => {
  return async (req, res, next) => {
    try {
      // Permission check temporarily disabled - allow all requests
      // const user = req.user; // populated from authenticateToken
      // const page_name = req.params.page_name || req.body.page_name || req.query.page_name;

      // if (!user || !user.Role_id) {
      //   console.warn(`⚠️ Permission check skipped - no user/token. Action: ${action}, Page: ${page_name}`);
      //   return next(); // Allow request to continue
      // }

      // const page = await Page.findOne({ where: { name: page_name } });
      // if (!page) {
      //   return res.status(404).json({ message: 'Page not found' });
      // }

      // const permission = await Permission.findOne({
      //   where: {
      //     role_id: user.Role_id,
      //     page_id: page.page_id
      //   }
      // });

      // if (!permission || !permission[`can_${action}`]) {
      //   return res.status(403).json({ message: `Access denied: ${action} permission required` });
      // }

      // Skip all permission checks for now
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error during permission check' });
    }
  };
};

module.exports = { checkPermission };
