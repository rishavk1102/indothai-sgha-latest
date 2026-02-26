const express = require('express');
const router = express.Router();
const Template = require('../NewModels/Template');
const TemplateYears = require('../NewModels/TemplateYears');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');

// Save or update template content
router.post(
  '/save/:page_name',
  authenticateToken,
  checkPermission('add'),
  async (req, res) => {
    try {
      const { year, type, content, template_id, template_name } = req.body;
      const templateNameVal = template_name != null && String(template_name).trim() !== '' ? String(template_name).trim() : null;

      console.log('📝 Save request received:', { year, type, template_id, template_name: templateNameVal, contentLength: content?.length });

      if (!year || !type) {
        return res.status(400).json({ 
          message: 'Year and type are required' 
        });
      }

      // Convert year to integer
      const yearInt = parseInt(year, 10);
      if (isNaN(yearInt) || yearInt < 1900 || yearInt > 2100) {
        return res.status(400).json({
          message: 'Year must be a valid number between 1900 and 2100',
        });
      }

      // Validate type is one of the allowed values
      const allowedTypes = ['Main Agreement', 'Annex A', 'Annex B'];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({ 
          message: `Type must be one of: ${allowedTypes.join(', ')}` 
        });
      }

      // Ensure year exists in TemplateYears so it appears in years-with-status / Add SGHA Template page
      let yearRecord = await TemplateYears.findOne({ where: { year: yearInt } });
      if (!yearRecord) {
        try {
          yearRecord = await TemplateYears.create({ year: yearInt });
          console.log('📅 Template year created:', yearInt);
        } catch (createErr) {
          console.error('❌ Failed to create TemplateYears row:', createErr.message);
          return res.status(500).json({
            message: 'Template saved but year could not be registered. Please add the year from Add SGHA Template.',
            error: createErr.message,
          });
        }
      }

      // Parse content if it's a string (frontend sends JSON string), otherwise use as-is
      let contentJson = null;
      if (content) {
        if (typeof content === 'string') {
          try {
            contentJson = JSON.parse(content);
          } catch (parseError) {
            return res.status(400).json({
              message: 'Invalid JSON format in content field',
              error: parseError.message
            });
          }
        } else {
          // Already an object
          contentJson = content;
        }
      }

      let result;

      if (template_id) {
        // If template_id is provided, update that specific template
        const existing = await Template.findByPk(template_id).catch(dbError => {
          console.error('❌ Database query error:', dbError);
          throw new Error(`Database error: ${dbError.message}. Please check if the table exists and matches the model.`);
        });

        if (!existing) {
          return res.status(404).json({ 
            message: `Template with ID ${template_id} not found` 
          });
        }

        // Update existing template
        result = await existing.update({
          type: type,
          content: contentJson,
        }).catch(updateError => {
          console.error('❌ Update error:', updateError);
          throw new Error(`Failed to update template: ${updateError.message}`);
        });
        console.log('✅ Updated existing template:', result.id);
      } else {
        // Look up by year + type + template_name (null = default) so we can have multiple templates per year
        const whereClause = {
          year: yearInt,
          type: type,
          template_name: templateNameVal,
        };
        const existing = await Template.findOne({
          where: whereClause,
        }).catch(dbError => {
          console.error('❌ Database query error:', dbError);
          throw new Error(`Database error: ${dbError.message}. Please check if the columns exist in the Template table.`);
        });

        console.log('🔍 Existing record:', existing ? `Found (ID: ${existing.id})` : 'Not found', whereClause);

        if (existing) {
          result = await existing.update({
            content: contentJson,
          }).catch(updateError => {
            console.error('❌ Update error:', updateError);
            throw new Error(`Failed to update template: ${updateError.message}`);
          });
          console.log('✅ Updated existing template:', result.id);
        } else {
          result = await Template.create({
            year: yearInt,
            type: type,
            content: contentJson,
            template_name: templateNameVal,
          }).catch(createError => {
            console.error('❌ Create error:', createError);
            if (createError.name === 'SequelizeDatabaseError' && createError.message.includes('Unknown column')) {
              throw new Error(`Database column error: ${createError.message}. Please run migration to add template_name column.`);
            }
            throw new Error(`Failed to create template: ${createError.message}`);
          });
          console.log('✅ Created new template:', result.id, templateNameVal ? `(name: ${templateNameVal})` : '');
        }
      }

      return res.status(200).json({
        message: 'Template content saved successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Failed to save template content:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        message: 'Failed to save template content',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);

// Get template content by year and type (optional template_name for multiple templates per year)
router.get(
  '/get/:year/:type/:page_name',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const { year, type } = req.params;
      const templateName = req.query.template_name != null && String(req.query.template_name).trim() !== ''
        ? String(req.query.template_name).trim()
        : null;

      const whereClause = {
        year: parseInt(year),
        type: type,
        template_name: templateName,
      };

      const template = await Template.findOne({
        where: whereClause,
      });

      return res.status(200).json({
        data: template,
      });
    } catch (error) {
      console.error('❌ Failed to get template content:', error);
      return res.status(500).json({
        message: 'Failed to get template content',
        error: error.message,
      });
    }
  }
);

// Get all template content for a specific year
router.get(
  '/get-year/:year/:page_name',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const { year } = req.params;

      const templates = await Template.findAll({
        where: {
          year: parseInt(year),
        },
        order: [['type', 'ASC']],
      });

      return res.status(200).json({
        data: templates,
      });
    } catch (error) {
      console.error('❌ Failed to get template contents:', error);
      return res.status(500).json({
        message: 'Failed to get template contents',
        error: error.message,
      });
    }
  }
);

module.exports = router;

