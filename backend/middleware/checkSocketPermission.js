// utils/checkSocketPermission.js
const Permission = require('../Models/Permission');
const Page = require('../Models/Page');

const checkSocketPermission = async (role_id, action, pageName) => {
  try {
    if (!role_id) {
      return { allowed: false, error: 'Missing role_id in request data' };
    }

    const page = await Page.findOne({ where: { name: pageName } });
    if (!page) {
      return { allowed: false, error: `Page "${pageName}" not found` };
    }

    const permission = await Permission.findOne({
      where: {
        role_id,
        page_id: page.page_id
      }
    });

    if (!permission || !permission[`can_${action}`]) {
      return { allowed: false, error: `Permission denied for action: ${action}` };
    }

    return { allowed: true };
  } catch (err) {
    return { allowed: false, error: err.message };
  }
};

module.exports = checkSocketPermission;
