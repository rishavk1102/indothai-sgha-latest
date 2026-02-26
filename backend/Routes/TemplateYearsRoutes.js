const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const TemplateYears = require('../NewModels/TemplateYears');
const Template = require('../NewModels/Template');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');

// Get all template years
router.get(
  '/all',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const years = await TemplateYears.findAll({
        order: [['year', 'DESC']], // Order by year descending (newest first)
        attributes: ['id', 'year', 'created_at'],
      });

      return res.status(200).json({
        message: 'Template years fetched successfully',
        data: years,
      });
    } catch (error) {
      console.error('❌ Failed to get template years:', error);
      return res.status(500).json({
        message: 'Failed to get template years',
        error: error.message,
      });
    }
  }
);

// Get years as simple array (just the year values)
router.get(
  '/years',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const years = await TemplateYears.findAll({
        order: [['year', 'DESC']],
        attributes: ['year'],
      });

      // Extract just the year values
      const yearValues = years.map(item => item.year).filter(year => year !== null);

      return res.status(200).json({
        message: 'Template years fetched successfully',
        data: yearValues,
      });
    } catch (error) {
      console.error('❌ Failed to get template years:', error);
      return res.status(500).json({
        message: 'Failed to get template years',
        error: error.message,
      });
    }
  }
);

// Get years that have data in ALL three: Main Agreement, Annex A, and Annex B (for dropdowns)
router.get(
  '/years-complete',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const years = await TemplateYears.findAll({
        order: [['year', 'DESC']],
        attributes: ['year'],
      });

      const completeYears = [];
      for (const yearRecord of years) {
        const year = yearRecord.year;
        if (year == null) continue;

        const [mainAgg, annexA, annexB] = await Promise.all([
          Template.findOne({ where: { year, type: 'Main Agreement' } }),
          Template.findOne({ where: { year, type: 'Annex A' } }),
          Template.findOne({ where: { year, type: 'Annex B' } }),
        ]);

        if (mainAgg && annexA && annexB) {
          completeYears.push(year);
        }
      }

      return res.status(200).json({
        message: 'Template years (complete) fetched successfully',
        data: completeYears,
      });
    } catch (error) {
      console.error('❌ Failed to get complete template years:', error);
      return res.status(500).json({
        message: 'Failed to get complete template years',
        error: error.message,
      });
    }
  }
);

// Get years with metadata and list of templates per year (multiple templates per year supported)
router.get(
  '/years-with-status',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const years = await TemplateYears.findAll({
        order: [['year', 'DESC']],
        attributes: ['id', 'year', 'created_at'],
      });

      const yearsWithStatus = await Promise.all(
        years.map(async (yearRecord) => {
          const year = yearRecord.year;
          const allForYear = await Template.findAll({
            where: {
              year: year,
              type: { [Op.in]: ['Main Agreement', 'Annex A', 'Annex B'] },
            },
            attributes: ['template_name'],
            raw: true,
          });
          const nameSet = new Set();
          allForYear.forEach((row) => nameSet.add(row.template_name != null ? row.template_name : null));
          const templateNames = Array.from(nameSet);
          const templates = templateNames.map((templateName) => {
            const count = allForYear.filter(
              (r) => (r.template_name != null ? r.template_name : null) === templateName
            ).length;
            return {
              templateName: templateName,
              hasData: count > 0,
            };
          });
          const hasData = templates.some((t) => t.hasData);
          return {
            id: yearRecord.id,
            year: year,
            created_at: yearRecord.created_at,
            hasData: hasData,
            templates: templates,
          };
        })
      );

      return res.status(200).json({
        message: 'Template years with status fetched successfully',
        data: yearsWithStatus,
      });
    } catch (error) {
      console.error('❌ Failed to get template years with status:', error);
      return res.status(500).json({
        message: 'Failed to get template years with status',
        error: error.message,
      });
    }
  }
);

// Create a new template year
router.post(
  '/create',
  authenticateToken,
  checkPermission('add'),
  async (req, res) => {
    try {
      const { year } = req.body;

      console.log('📝 Create year request received:', { year });

      if (!year) {
        return res.status(400).json({
          message: 'Year is required',
        });
      }

      // Validate year is a valid number
      const yearInt = parseInt(year);
      if (isNaN(yearInt) || yearInt <= 0) {
        return res.status(400).json({
          message: 'Year must be a valid positive number',
        });
      }

      // Validate year is in reasonable range (1900-2100)
      if (yearInt < 1900 || yearInt > 2100) {
        return res.status(400).json({
          message: 'Year must be between 1900 and 2100',
        });
      }

      // Check if year already exists
      const existing = await TemplateYears.findOne({
        where: { year: yearInt },
      });

      if (existing) {
        return res.status(400).json({
          message: `Year ${yearInt} already exists`,
        });
      }

      const newYear = await TemplateYears.create({
        year: yearInt,
      });

      console.log('✅ Template year created successfully:', newYear.id);

      return res.status(201).json({
        message: 'Template year created successfully',
        data: newYear,
      });
    } catch (error) {
      console.error('❌ Failed to create template year:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        message: 'Failed to create template year',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);

// Delete a template year
router.delete(
  '/delete/:id',
  authenticateToken,
  checkPermission('delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const year = await TemplateYears.findByPk(id);

      if (!year) {
        return res.status(404).json({
          message: 'Template year not found',
        });
      }

      // Check if year has any template data before deleting
      const templates = await Template.findAll({
        where: {
          year: year.year,
          type: {
            [Op.in]: ['Main Agreement', 'Annex A', 'Annex B'],
          },
        },
      });

      if (templates.length > 0) {
        return res.status(400).json({
          message: 'Cannot delete year that has template data. Please delete the templates first.',
        });
      }

      await year.destroy();

      console.log('✅ Template year deleted successfully:', id);

      return res.status(200).json({
        message: 'Template year deleted successfully',
      });
    } catch (error) {
      console.error('❌ Failed to delete template year:', error);
      return res.status(500).json({
        message: 'Failed to delete template year',
        error: error.message,
      });
    }
  }
);

module.exports = router;

