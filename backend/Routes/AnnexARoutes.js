// routes/annex.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const SghaTemplate = require('../Models_sgha/SGHA_Section_Template');
const AnnxSec = require('../Models_sgha/Annxsec');
const AnnxSubSec = require('../Models_sgha/AnnxSubSec');
const AnnxSubPart = require('../Models_sgha/AnnxSubPart');
const AnnexTableRow = require('../NewModels/AnnexTableRow');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

// ✅ Add Template + Sections (with SubSecs only + Categories)
router.post(
  '/add_template',
  authenticateToken,
  checkPermission('add'),
  async (req, res) => {
    const { template_name, Section_position, sections, category_ids } = req.body;
    // 👆 expecting an array of category IDs

    let transaction;

    try {
      transaction = await sequelize.transaction();

      // Step 1: Create Template
      const template = await SghaTemplate.create(
        {
          template_name,
          Section_position
        },
        { transaction }
      );

      const createdSections = [];

      // Step 2: Create Sections
      if (Array.isArray(sections) && sections.length > 0) {
        for (const sec of sections) {
          const section = await AnnxSec.create(
            {
              SGHA_T_id: template.SGHA_T_id,
              code: sec.code,
              title: sec.title
            },
            { transaction }
          );

          const createdSubSecs = [];

          // Step 3: Create SubSecs
          if (Array.isArray(sec.subsecs) && sec.subsecs.length > 0) {
            for (const sub of sec.subsecs) {
              const subsec = await AnnxSubSec.create(
                {
                  sec_id: section.sec_id,
                  code: sub.code,
                  title: sub.title
                },
                { transaction }
              );

              createdSubSecs.push(subsec);
            }
          }

          createdSections.push({
            ...section.toJSON(),
            subsecs: createdSubSecs
          });
        }
      }

      // ✅ Step 4: Link Categories
      let createdCategories = [];
      if (Array.isArray(category_ids) && category_ids.length > 0) {
        for (const catId of category_ids) {
          const link = await SghaTmplCat.create(
            {
              SGHA_T_id: template.SGHA_T_id,
              category_id: catId
            },
            { transaction }
          );
          createdCategories.push(link);
        }
      }

      await transaction.commit();

      return res.status(201).json({
        message: 'Template, sections, and categories added successfully',
        template,
        sections: createdSections,
        categories: createdCategories
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('❌ Failed to add template + sections + categories:', error);

      return res.status(500).json({
        message: 'Failed to add template + sections + categories',
        error: error.message
      });
    } finally {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
    }
  }
);

// Get table row by row_id
router.get(
  '/table-row/:row_id/:page_name',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const { row_id } = req.params;

      const tableRow = await AnnexTableRow.findByPk(parseInt(row_id));

      if (!tableRow) {
        return res.status(404).json({
          message: 'Table row not found',
        });
      }

      return res.status(200).json({
        data: tableRow,
      });
    } catch (error) {
      console.error('❌ Failed to get table row:', error);
      return res.status(500).json({
        message: 'Failed to get table row',
        error: error.message,
      });
    }
  }
);

module.exports = router;
