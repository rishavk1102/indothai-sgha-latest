// Seed SGHA Tariffs page + Admin permissions.
// Page `name` must match PAGE_PERMISSION_NAMES.sghaTariffs ("SGHA Tariffs").
// Run: node seed_sgha_tariff_pages.js

const sequelize = require('./config/database');
const MenuGroup = require('./Models/MenuGroup');
const Page = require('./Models/Page');
const Permission = require('./Models/Permission');
const Role = require('./Models/Role');

const TARIFF_PAGE = {
  name: 'SGHA Tariffs',
  path: '/dashboard/sgha_tariffs',
  icon_url: 'FiDollarSign',
  order_index: 25,
  show_in_menu: true,
  description: 'Frozen tariffs from completed SGHAs',
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
      group = await MenuGroup.findOne({
        where: { name: 'Agreements' },
        transaction,
      });
    }
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
      console.log('created menu group Pricing');
    } else {
      console.log(`using menu group ${group.name}`);
    }

    let page = await Page.findOne({
      where: { name: TARIFF_PAGE.name },
      transaction,
    });
    if (!page) {
      page = await Page.create(
        {
          ...TARIFF_PAGE,
          menu_group_id: group.menu_group_id,
        },
        { transaction }
      );
      console.log(`created page ${TARIFF_PAGE.name}`);
    } else {
      await page.update(
        {
          path: TARIFF_PAGE.path,
          icon_url: TARIFF_PAGE.icon_url,
          show_in_menu: true,
          menu_group_id: page.menu_group_id || group.menu_group_id,
        },
        { transaction }
      );
      console.log(`page exists ${TARIFF_PAGE.name}`);
    }

    const adminRole =
      (await Role.findOne({ where: { Role_name: 'Admin' }, transaction })) ||
      (await Role.findOne({ where: { role_name: 'Admin' }, transaction })) ||
      (await Role.findOne({ transaction }));

    if (!adminRole) {
      throw new Error('No role found to grant tariff permissions');
    }

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
    console.log('SGHA Tariffs page/permissions seeded');
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
