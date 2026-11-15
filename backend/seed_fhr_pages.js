// Seed FHR menu group, pages, and full Admin permissions.
// Page `name` values match the FHR UI PAGE_NAME strings (e.g. "FHR Draft").
// Run: node seed_fhr_pages.js

const sequelize = require('./config/database');
const MenuGroup = require('./Models/MenuGroup');
const Page = require('./Models/Page');
const Permission = require('./Models/Permission');
const Role = require('./Models/Role');

const FHR_PAGES = [
  { name: 'FHR List', path: '/dashboard/upcoming_flights', icon_url: 'FiList', order_index: 5, show_in_menu: true },
  { name: 'FHR Draft', path: '/dashboard/FHR_draft', icon_url: 'FiFileText', order_index: 10, show_in_menu: true },
  { name: 'FHR Pending', path: '/dashboard/FHR_pending', icon_url: 'FiClock', order_index: 20, show_in_menu: true },
  { name: 'FHR Submitted', path: '/dashboard/FHR_submitted', icon_url: 'FiSend', order_index: 30, show_in_menu: true },
  { name: 'FHR Completed', path: '/dashboard/FHR_completed', icon_url: 'FiCheckCircle', order_index: 40, show_in_menu: true },
  { name: 'FHR Cancelled', path: '/dashboard/FHR_cancelled', icon_url: 'FiXCircle', order_index: 50, show_in_menu: true },
  { name: 'Non Schedule FHR', path: '/dashboard/FHR_nonschedule', icon_url: 'FiCalendar', order_index: 60, show_in_menu: true },
  { name: 'FHR Import', path: '/dashboard/FHR_import', icon_url: 'FiUpload', order_index: 70, show_in_menu: true },
  { name: 'FHR Edit', path: '/dashboard/edit_fhr', icon_url: 'FiEdit', order_index: 80, show_in_menu: false },
];

async function seed() {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.authenticate();

    let group = await MenuGroup.findOne({
      where: { name: 'FHR' },
      transaction,
    });
    if (!group) {
      const maxOrder = await MenuGroup.max('order_index', { transaction });
      group = await MenuGroup.create(
        {
          name: 'FHR',
          icon_url: 'FiClipboard',
          order_index: (maxOrder || 20) + 1,
        },
        { transaction }
      );
      console.log('created menu group FHR');
    } else {
      console.log('menu group FHR exists');
    }

    const pageIds = [];
    for (const page of FHR_PAGES) {
      let row = await Page.findOne({ where: { name: page.name }, transaction });
      if (!row) {
        row = await Page.create(
          {
            ...page,
            description: page.name,
            menu_group_id: group.menu_group_id,
          },
          { transaction }
        );
        console.log(`created page ${page.name}`);
      } else {
        console.log(`page exists ${page.name}`);
      }
      pageIds.push(row.page_id);
    }

    const adminRole =
      (await Role.findOne({ where: { Role_name: 'Admin' }, transaction })) ||
      (await Role.findOne({ where: { role_name: 'Admin' }, transaction })) ||
      (await Role.findOne({ transaction }));

    if (!adminRole) {
      throw new Error('No role found to grant FHR permissions');
    }

    const roleId = adminRole.Role_id || adminRole.role_id;
    for (const pageId of pageIds) {
      const [perm, created] = await Permission.findOrCreate({
        where: { role_id: roleId, page_id: pageId },
        defaults: {
          role_id: roleId,
          page_id: pageId,
          can_view: true,
          can_add: true,
          can_edit: true,
          can_delete: true,
        },
        transaction,
      });
      if (!created) {
        await perm.update(
          { can_view: true, can_add: true, can_edit: true, can_delete: true },
          { transaction }
        );
      }
      console.log(`permission role=${roleId} page=${pageId}`);
    }

    await transaction.commit();
    console.log('FHR pages/permissions seeded');
  } catch (error) {
    await transaction.rollback();
    console.error('Error:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seed();
