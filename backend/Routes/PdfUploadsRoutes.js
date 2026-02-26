const express = require('express');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getMinioClient } = require('../config/minioConfig');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');

const router = express.Router();
const PAGE_NAME = 'PDF Uploads';

/**
 * GET /api/pdf-uploads/file-content?path=object-key
 * Fetches file content from MinIO by object path (key).
 * path: the object key within MINIO_BUCKET (e.g. "uploads/xyz/segregated-main-agreement.json")
 */
router.get(
  '/file-content',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const pathParam = req.query.path;
      if (!pathParam || typeof pathParam !== 'string') {
        return res.status(400).json({
          message: 'Query parameter "path" (object key) is required',
        });
      }

      const bucket = process.env.MINIO_BUCKET;
      const client = getMinioClient();
      if (!bucket || !client) {
        return res.status(500).json({
          message:
            'MinIO not configured. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, and MINIO_BUCKET in backend .env',
        });
      }

      const key = pathParam.trim();
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await client.send(command);
      const body = response.Body;
      if (!body) {
        return res.status(404).json({
          message: 'Object empty or not found',
        });
      }

      const chunks = [];
      for await (const chunk of body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const contentType = (response.ContentType || '').toLowerCase();
      const isJson =
        contentType.includes('json') ||
        (key.endsWith('.json') && buffer.length > 0);

      if (isJson) {
        try {
          const text = buffer.toString('utf8');
          const parsed = JSON.parse(text);
          return res.json(parsed);
        } catch (e) {
          return res.status(500).json({
            message: 'File is not valid JSON',
            error: e.message,
          });
        }
      }

      const isText =
        contentType.includes('text/plain') ||
        contentType.includes('text/') ||
        key.endsWith('.txt');
      if (isText) {
        const text = buffer.toString('utf8');
        return res.json({ type: 'text', content: text });
      }

      res.set({
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } catch (err) {
      if (err.name === 'NoSuchKey') {
        return res.status(404).json({
          message: 'File not found in MinIO',
          error: err.message,
        });
      }
      console.error('PdfUploads file-content error:', err);
      const isNetwork = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT';
      const message = isNetwork
        ? 'Cannot reach MinIO. Check MINIO_ENDPOINT and that MinIO is running.'
        : 'Failed to fetch file content from MinIO';
      return res.status(500).json({
        message,
        error: err.message,
      });
    }
  }
);

module.exports = router;
