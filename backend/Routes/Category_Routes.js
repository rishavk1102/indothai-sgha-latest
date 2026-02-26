const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Category = require('../Models/Category');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

// ➤ Add Category
router.post('/add_category/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { name, description } = req.body;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const newCategory = await Category.create({ name, description }, { transaction });

        await transaction.commit();
        getIO().emit('categories-updated');

        return res.status(201).json({ message: 'Category added successfully', category: newCategory });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to add category:', error);
        return res.status(500).json({ message: 'Failed to add category', error: error.message });
    }
    finally {
        // Explicitly rollback if transaction is still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

// ➤ Edit Category
router.put('/edit_category/:category_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { category_id } = req.params;
    const { name, description } = req.body;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const category = await Category.findByPk(category_id, { transaction });
        if (!category) return res.status(404).json({ message: 'Category not found' });

        await category.update({ name, description }, { transaction });
        await transaction.commit();

        getIO().emit('categories-updated');

        return res.status(200).json({ message: 'Category updated successfully', category });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to update category:', error);
        return res.status(500).json({ message: 'Failed to update category', error: error.message });
    }
    finally {
        // Explicitly rollback if transaction is still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

// ➤ Delete Category
router.delete('/delete_category/:category_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
    const { category_id } = req.params;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const category = await Category.findByPk(category_id, { transaction });
        if (!category) return res.status(404).json({ message: 'Category not found' });

        await category.destroy({ transaction });
        await transaction.commit();

        getIO().emit('categories-updated');

        return res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to delete category:', error);
        return res.status(500).json({ message: 'Failed to delete category', error: error.message });
    }
    finally {
        // Explicitly rollback if transaction is still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

// ➤ Duplicate Category
router.post('/duplicate_category/:category_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { category_id } = req.params;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const original = await Category.findByPk(category_id, { transaction });
        if (!original) return res.status(404).json({ message: 'Original category not found' });

        const duplicate = await Category.create({
            name: `${original.name} (Copy)`,
            description: original.description
        }, { transaction });

        await transaction.commit();

        getIO().emit('categories-updated');

        return res.status(201).json({ message: 'Category duplicated successfully', category: duplicate });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to duplicate category:', error);
        return res.status(500).json({ message: 'Failed to duplicate category', error: error.message });
    }
    finally {
        // Explicitly rollback if transaction is still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

module.exports = router;
