const express = require('express');
const router = express.Router();
const Page = require('../Models/Page');
const Role = require('../Models/Role');
const Permission = require('../Models/Permission');
const MenuGroup = require('../Models/MenuGroup');
const sequelize = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { Op } = require('sequelize'); // Import Op from sequelize
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler'); // adjust the path as needed

// POST /api / menu - groups - Add a new menu group with transaction
router.post('/add_menu_group', authenticateToken, async (req, res) => {
    const { name, icon_url, order_index = 0 } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        // Check for duplicate
        const existing = await MenuGroup.findOne({ where: { name }, transaction });
        if (existing) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Menu group with this name already exists' });
        }

        // Create the menu group
        const menuGroup = await MenuGroup.create(
            { name, icon_url, order_index },
            { transaction }
        );

        await transaction.commit();
        res.status(201).json({
            message: 'Menu group created successfully',
            menuGroup,
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error creating menu group:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});
// PUT /api/menu-groups/:id - Update a menu group
router.put('/edit_menu_group/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, icon_url, order_index } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const menuGroup = await MenuGroup.findByPk(id, { transaction });
        if (!menuGroup) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Menu group not found' });
        }

        // Optional: prevent renaming to another existing group's name
        if (name && name !== menuGroup.name) {
            const duplicate = await MenuGroup.findOne({ where: { name }, transaction });
            if (duplicate) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Another menu group with this name already exists' });
            }
        }

        // Update fields only if new values provided
        menuGroup.name = name ?? menuGroup.name;
        menuGroup.icon_url = icon_url ?? menuGroup.icon_url;
        menuGroup.order_index = order_index ?? menuGroup.order_index;

        await menuGroup.save({ transaction });
        await transaction.commit();

        res.json({ message: 'Menu group updated successfully', menuGroup });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error updating menu group:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// POST /api/pages - create a new page and assign SuperAdmin permissions
router.post('/add_page', authenticateToken, async (req, res) => {
    const { name, description, menu_group, path, icon_url } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        // 1. Create the new page
        const newPage = await Page.create({ name, description, menu_group, path, icon_url }, { transaction });

        // 2. Get the SuperAdmin role_id
        const superAdmin = await Role.findOne({
            where: { role_name: 'SuperAdmin' },
            transaction
        });

        if (!superAdmin) {
            await transaction.rollback();
            return res.status(400).json({ message: 'SuperAdmin role not found' });
        }

        // 3. Create full permissions for SuperAdmin
        await Permission.create({
            role_id: superAdmin.Role_id,
            page_id: newPage.page_id,
            can_view: true,
            can_add: true,
            can_edit: true,
            can_delete: true,
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            message: 'Page created and permissions assigned to SuperAdmin',
            page: newPage,
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error creating page with transaction:', error);
        res.status(500).json({ message: 'Server error while creating page' });
    }
    finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



// Update a page
router.put('/editpage/:page_id', authenticateToken, async (req, res) => {
    const { page_id } = req.params;
    const { name, description, menu_group, path, icon_url } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const page = await Page.findByPk(page_id, { transaction });

        if (!page) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Page not found' });
        }

        page.name = name || page.name;
        page.description = description || page.description;
        page.menu_group = menu_group || page.menu_group;
        page.path = path || page.path;
        page.icon_url = icon_url || page.icon_url;
        await page.save({ transaction });

        await transaction.commit();
        res.json({ message: 'Page updated successfully', page });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error updating page:', error);
        res.status(500).json({ message: 'Server error while updating page' });
    }
    finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// Bulk add or update permissions for a role on multiple pages
router.post('/add_permissions_bulk', authenticateToken, async (req, res) => {
    const { role_id, permissions } = req.body;

    if (!Array.isArray(permissions) || !role_id) {
        return res.status(400).json({ message: 'Invalid input. role_id and permissions array are required.' });
    }

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const role = await Role.findByPk(role_id, { transaction });
        if (!role) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Role not found' });
        }

        const results = [];

        for (const perm of permissions) {
            const { page_id, can_view, can_add, can_edit, can_delete } = perm;

            const page = await Page.findByPk(page_id, { transaction });
            if (!page) {
                results.push({ page_id, status: 'Page not found' });
                continue;
            }

            const [permission, created] = await Permission.findOrCreate({
                where: { role_id, page_id },
                defaults: { can_view, can_add, can_edit, can_delete },
                transaction,
            });

            if (!created) {
                permission.can_view = can_view ?? permission.can_view;
                permission.can_add = can_add ?? permission.can_add;
                permission.can_edit = can_edit ?? permission.can_edit;
                permission.can_delete = can_delete ?? permission.can_delete;
                await permission.save({ transaction });
                results.push({ page_id, status: 'Updated' });
            } else {
                results.push({ page_id, status: 'Created' });
            }
        }

        await transaction.commit();
        const io = getIO();
        io.emit("PermissionsUpdated", { role_id, timestamp: new Date() }); // Broadcast update
        res.status(200).json({
            message: 'Permissions processed successfully',
            results,
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error processing bulk permissions:', error);
        res.status(500).json({ message: 'Server error while managing permissions' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



// Get pages and permissions for a specific role where can_view = true
router.get('/fetch_pages_by_role/:role_id', authenticateToken, async (req, res) => {
    const { role_id } = req.params;

    try {
        const role = await Role.findByPk(role_id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        const pagesWithPermissions = await Page.findAll({
            where: {
                show_in_menu: true,
            },
            include: [
                {
                    model: Permission,
                    where: {
                        role_id: role_id,
                        can_view: true
                    },
                    required: true, // Ensures only pages with matching permissions are returned
                    attributes: []
                },
                {
                    model: MenuGroup,
                    as: 'menu_group',
                    required: false, // Allow pages without menu_group
                    attributes: ['menu_group_id', 'name', 'icon_url', 'order_index']
                }
            ],
            order: [
                ['order_index', 'ASC'] // Simple ordering by page order_index
            ],
            raw: false, // Return Sequelize model instances
            nest: true // Nest associated data
        });

        // Sort pages in JavaScript: first by menu_group order_index, then by page order_index
        const sortedPages = pagesWithPermissions.sort((a, b) => {
            const aGroupOrder = a.menu_group?.order_index ?? 999999;
            const bGroupOrder = b.menu_group?.order_index ?? 999999;
            
            if (aGroupOrder !== bGroupOrder) {
                return aGroupOrder - bGroupOrder;
            }
            
            return a.order_index - b.order_index;
        });

        res.json({ role: role.role_name, pages: sortedPages });
    } catch (error) {
        console.error('Error fetching pages by role:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});



// Fetch all roles excluding specific ones
router.get('/allroles', authenticateToken, async (req, res) => {
    try {
        // Find roles excluding specific role names
        const roles = await Role.findAll({
            where: {
                role_name: {
                    [Op.notIn]: ['SuperAdmin'] // Excluded roles
                }
            }
        });

        // Return empty array if no roles found
        if (!roles.length) {
            return res.status(200).json([]);
        }

        res.status(200).json(roles);
    } catch (error) {
        console.error('Error fetching roles data:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


// Create a new role
router.post('/add-role', authenticateToken, async (req, res) => {
    const { role_name, role_description } = req.body;

    let transaction;

    try {
        if (!role_name || !role_description) {
            return res.status(400).json({ message: 'role_name and role_description are required.' });
        }

        transaction = await sequelize.transaction();

        // Check for duplicate role
        const existingRole = await Role.findOne({
            where: { role_name },
            transaction
        });

        if (existingRole) {
            await transaction.rollback();
            return res.status(409).json({ message: 'Role with this name already exists.' });
        }

        // Create the role
        const newRole = await Role.create(
            { role_name, role_description },
            { transaction }
        );

        await transaction.commit();
        res.status(201).json({
            message: 'Role created successfully.',
            role: newRole
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Error creating role:', error);
        res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



// GET /api/pages - fetch all pages
router.get('/allpages', authenticateToken, async (req, res) => {
    try {
        const pages = await Page.findAll({
            order: [['order_index', 'ASC']] // Optional: sort by order_index
        });

        res.status(200).json(pages);
    } catch (error) {
        console.error('❌ Error fetching pages:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


// GET /api/permissions/:role_id - Fetch permissions for a specific role
router.get('/permissions/:role_id', authenticateToken, async (req, res) => {
    const { role_id } = req.params;

    try {
        const permissions = await Permission.findAll({
            where: { role_id },
        });

        if (!permissions.length) {
            return res.status(404).json({ message: 'No permissions found for this role.' });
        }

        res.status(200).json(permissions);
    } catch (error) {
        console.error('❌ Error fetching permissions:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});





module.exports = router;
