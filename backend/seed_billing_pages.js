// Seed Billing Review page + Admin permissions.
// show_in_menu stays 0 so live deploy does not grow a More group.
// Run: node seed_billing_pages.js

const sequelize = require('./config/database');
const MenuGroup = require('./Models/MenuGroup');
const Page = require('./Models/Page');
const Permission = require('./Models/Permission');
const Role = require('./Models/Role');

const BILLING_PAGE = {
  name: 'Billing Review',
  path: '/dashboard/billing',
  icon_url: 'FiDollarSign',
  order_index: 30,
  show_in_menu: false,
  description: 'Rate-to-invoice billing review',
};

async function seed() {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.authenticate();

    let group = await MenuGroup.findOne({
      where: { name: 'Pricing' },
      transaction,
    });
    if (!group) {
      const maxOrder = await MenuGroup.max('order_index', { transaction });
      group = await MenuGroup.create(
        {
          name: 'Pricing',
          icon_url: 'FiDollarSign',
          order_index: (maxOrder || 50) + 1,
        },
        { transaction }
      );
    }

    let page = await Page.findOne({
      where: { name: BILLING_PAGE.name },
      transaction,
    });
    if (!page) {
      page = await Page.create(
        {
          ...BILLING_PAGE,
          menu_group_id: group.menu_group_id,
        },
        { transaction }
      );
      console.log(`created page ${BILLING_PAGE.name}`);
    } else {
      await page.update(
        {
          path: BILLING_PAGE.path,
          show_in_menu: false,
        },
        { transaction }
      );
      console.log(`page exists ${BILLING_PAGE.name}`);
    }

    const adminRole =
      (await Role.findOne({ where: { Role_name: 'Admin' }, transaction })) ||
      (await Role.findOne({ where: { role_name: 'Admin' }, transaction })) ||
      (await Role.findOne({ transaction }));
    if (!adminRole) throw new Error('No role found');

    const roleId = adminRole.Role_id || adminRole.role_id;
    const [perm, created] = await Permission.findOrCreate({
      where: { role_id: roleId, page_id: page.page_id },
      defaults: {
        role_id: roleId,
        page_id: page.page_id,
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
    console.log(`permission role=${roleId} page=${page.page_id}`);
    await transaction.commit();
    console.log('Billing page seeded (hidden from live menu)');
  } catch (error) {
    await transaction.rollback();
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seed();
