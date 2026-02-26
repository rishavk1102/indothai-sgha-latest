const express = require('express');
const router = express.Router();
const ClientAnnexBSubmission = require('../NewModels/ClientAnnexBSubmission');
const AnnexBSubmissionVariables = require('../NewModels/AnnexBSubmissionVariables');
const Submission = require('../NewModels/Submission');

/**
 * POST /api/client/annex-b-submission
 * Create Annex B submission and optionally save variables (e.g. aircraft_options)
 * Throttle is applied only to annex-a-submission; this follow-up call is allowed in the same flow.
 */
router.post(
  '/annex-b-submission',
  async (req, res) => {
    try {
      const { client_registration_id, agreement_year, variables, annex_a_submission_id } = req.body;

      if (!client_registration_id) {
        return res.status(400).json({
          message: 'client_registration_id is required',
          error: 'Validation error',
        });
      }

      const year = typeof agreement_year === 'number' ? agreement_year : parseInt(agreement_year, 10) || 2025;
      if (year < 2000 || year > 2100) {
        return res.status(400).json({
          message: 'agreement_year must be a valid year between 2000 and 2100',
          error: 'Validation error',
        });
      }

      const submission = await ClientAnnexBSubmission.create({
        client_registration_id,
        agreement_year: year,
        submission_timestamp: new Date(),
      });

      if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
        for (const [varName, varValue] of Object.entries(variables)) {
          const valueStr = typeof varValue === 'object' && varValue !== null
            ? JSON.stringify(varValue)
            : String(varValue || '');
          await AnnexBSubmissionVariables.upsert({
            annex_b_submission_id: submission.annex_b_submission_id,
            variable_name: varName,
            variable_value: valueStr,
          });
          if (varName === 'additional_charges') {
            const count = Array.isArray(varValue) ? varValue.length : 0;
            console.log(`✅ Saved additional_charges for annex_b_submission_id=${submission.annex_b_submission_id} (${count} selected)`);
          }
        }
      }

      // Link Annex A and Annex B into one Submission record when annex_a_submission_id is provided
      let submissionLink = null;
      const annexAId = annex_a_submission_id != null ? parseInt(annex_a_submission_id, 10) : NaN;
      if (!isNaN(annexAId) && annexAId > 0) {
        submissionLink = await Submission.create({
          client_registration_id,
          agreement_year: year,
          annex_a_submission_id: annexAId,
          annex_b_submission_id: submission.annex_b_submission_id,
        });
        console.log(`✅ Submission link created: id=${submissionLink.id} (annex_a=${annexAId}, annex_b=${submission.annex_b_submission_id})`);
      }

      console.log(`✅ Annex B submission saved for client ${client_registration_id}, year ${year}`);

      const responseData = {
        annex_b_submission_id: submission.annex_b_submission_id,
        agreement_year: submission.agreement_year,
        submission_timestamp: submission.submission_timestamp,
        status: submission.status,
      };
      if (submissionLink) {
        responseData.submission_id = submissionLink.id;
        responseData.annex_a_submission_id = annexAId;
      }

      return res.status(201).json({
        message: 'Annex B submission saved successfully',
        data: responseData,
      });
    } catch (error) {
      console.error('❌ Failed to save Annex B submission:', error);
      return res.status(500).json({
        message: 'Failed to save Annex B submission',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/client/annex-b-submissions?client_registration_id=123&year=2025
 */
router.get(
  '/annex-b-submissions',
  async (req, res) => {
    try {
      const { client_registration_id, year } = req.query;

      if (!client_registration_id) {
        return res.status(400).json({
          message: 'client_registration_id is required as query parameter',
          error: 'Validation error',
        });
      }

      const whereClause = { client_registration_id };

      if (year) {
        const yearInt = parseInt(year, 10);
        if (isNaN(yearInt) || yearInt < 2000 || yearInt > 2100) {
          return res.status(400).json({
            message: 'Invalid year parameter',
            error: 'Validation error',
          });
        }
        whereClause.agreement_year = yearInt;
      }

      const submissions = await ClientAnnexBSubmission.findAll({
        where: whereClause,
        order: [['submission_timestamp', 'DESC']],
        attributes: [
          'annex_b_submission_id',
          'agreement_year',
          'submission_timestamp',
          'status',
          'created_at',
          'updated_at',
        ],
      });

      return res.status(200).json({
        message: 'Annex B submissions retrieved successfully',
        data: submissions,
        count: submissions.length,
      });
    } catch (error) {
      console.error('❌ Failed to retrieve Annex B submissions:', error);
      return res.status(500).json({
        message: 'Failed to retrieve Annex B submissions',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/client/annex-b-submissions/:annex_b_submission_id/variables
 */
router.get(
  '/annex-b-submissions/:annex_b_submission_id/variables',
  async (req, res) => {
    try {
      const { annex_b_submission_id } = req.params;
      const idInt = parseInt(annex_b_submission_id, 10);
      if (isNaN(idInt) || idInt <= 0) {
        return res.status(400).json({
          message: 'Invalid annex_b_submission_id',
          error: 'Validation error',
        });
      }

      const submission = await ClientAnnexBSubmission.findByPk(idInt);
      if (!submission) {
        return res.status(404).json({
          message: 'Annex B submission not found',
          error: 'Not found',
        });
      }

      const variables = await AnnexBSubmissionVariables.findAll({
        where: { annex_b_submission_id: idInt },
        order: [['variable_name', 'ASC']],
      });

      const variablesObj = {};
      variables.forEach(v => {
        try {
          variablesObj[v.variable_name] = JSON.parse(v.variable_value);
        } catch {
          variablesObj[v.variable_name] = v.variable_value;
        }
      });

      return res.status(200).json({
        message: 'Variables retrieved successfully',
        data: variablesObj,
      });
    } catch (error) {
      console.error('❌ Failed to retrieve Annex B variables:', error);
      return res.status(500).json({
        message: 'Failed to retrieve variables',
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/client/annex-b-submissions/:annex_b_submission_id/variables
 */
router.put(
  '/annex-b-submissions/:annex_b_submission_id/variables',
  async (req, res) => {
    try {
      const { annex_b_submission_id } = req.params;
      const { variables } = req.body;

      const idInt = parseInt(annex_b_submission_id, 10);
      if (isNaN(idInt) || idInt <= 0) {
        return res.status(400).json({
          message: 'Invalid annex_b_submission_id',
          error: 'Validation error',
        });
      }

      if (!variables || typeof variables !== 'object') {
        return res.status(400).json({
          message: 'Variables must be an object',
          error: 'Validation error',
        });
      }

      const submission = await ClientAnnexBSubmission.findByPk(idInt);
      if (!submission) {
        return res.status(404).json({
          message: 'Annex B submission not found',
          error: 'Not found',
        });
      }

      const updatedVariables = {};
      for (const [varName, varValue] of Object.entries(variables)) {
        const valueStr = typeof varValue === 'object' && varValue !== null
          ? JSON.stringify(varValue)
          : String(varValue || '');

        const [variable] = await AnnexBSubmissionVariables.upsert({
          annex_b_submission_id: idInt,
          variable_name: varName,
          variable_value: valueStr,
        }, {
          returning: true,
        });

        try {
          updatedVariables[varName] = JSON.parse(variable.variable_value);
        } catch {
          updatedVariables[varName] = variable.variable_value;
        }
      }

      return res.status(200).json({
        message: 'Variables updated successfully',
        data: updatedVariables,
      });
    } catch (error) {
      console.error('❌ Failed to update Annex B variables:', error);
      return res.status(500).json({
        message: 'Failed to update variables',
        error: error.message,
      });
    }
  }
);

module.exports = router;
