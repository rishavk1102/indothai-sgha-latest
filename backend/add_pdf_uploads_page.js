// Seed script: Add "PDF Uploads" page under SGHA Builder for employee roles.
// Run from backend folder: node add_pdf_uploads_page.js

require('dotenv').config();
const { Op } = require('sequelize');
const sequelize = require('./config/database');
const Page = require('./Models/Page');
const MenuGroup = require('./Models/MenuGroup');
const Role = require('./Models/Role');
const Permission = require('./Models/Permission');

async function addPdfUploadsPage() {
  let transaction;
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    transaction = await sequelize.transaction();

    // 1. Find SGHA Builder menu group
    const sghaBuilderGroup = await MenuGroup.findOne({
      where: { name: 'SGHA Builder' },
      transaction,
    });

    if (!sghaBuilderGroup) {
      console.error('❌ Menu group "SGHA Builder" not found.');
      await transaction.rollback();
      return;
    }

    // 2. Check if PDF Uploads page already exists
    const existingPage = await Page.findOne({
      where: { name: 'PDF Uploads' },
      transaction,
    });

    let page;
    if (existingPage) {
      console.log('ℹ️  Page "PDF Uploads" already exists (page_id:', existingPage.page_id, ')');
      page = existingPage;
    } else {
      // Get max order_index for pages in this group
      const maxOrder = await Page.max('order_index', {
        where: { menu_group_id: sghaBuilderGroup.menu_group_id },
        transaction,
      });
      const orderIndex = (maxOrder ?? -1) + 1;

      page = await Page.create(
        {
          name: 'PDF Uploads',
          description: 'Upload and manage PDF documents',
          path: '/dashboard/pdfUploads',
          icon_url: 'FiFileText',
          menu_group_id: sghaBuilderGroup.menu_group_id,
          order_index: orderIndex,
          show_in_menu: true,
        },
        { transaction }
      );
      console.log('✅ Page "PDF Uploads" created (page_id:', page.page_id, ')');
    }

    // 3. Assign can_view to all roles except Client (employee side)
    const employeeRoles = await Role.findAll({
      where: { role_name: { [Op.ne]: 'Client' } },
      transaction,
    });

    for (const role of employeeRoles) {
      const [perm, created] = await Permission.findOrCreate({
        where: { role_id: role.Role_id, page_id: page.page_id },
        defaults: { can_view: true, can_add: false, can_edit: false, can_delete: false },
        transaction,
      });
      if (!created && !perm.can_view) {
        perm.can_view = true;
        await perm.save({ transaction });
      }
      if (created) console.log('   Permission added for role:', role.role_name);
    }

    await transaction.commit();
    console.log('✅ PDF Uploads page is now a child of SGHA Builder for employee roles.');
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

addPdfUploadsPage();
