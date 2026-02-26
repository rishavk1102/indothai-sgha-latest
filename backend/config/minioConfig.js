const { S3Client } = require('@aws-sdk/client-s3');

let cachedClient = null;

// MinIO is S3-compatible; use AWS SDK with MinIO endpoint.
// Returns null when env is not set so the route can return a clear error.
function getMinioClient() {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) return null;

  if (cachedClient) return cachedClient;

  const region = process.env.MINIO_REGION || 'us-east-1';
  let endpointUrl = endpoint.trim();
  if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
    endpointUrl = process.env.MINIO_USE_SSL === 'false' ? `http://${endpointUrl}` : `https://${endpointUrl}`;
  }
  cachedClient = new S3Client({
    endpoint: endpointUrl,
    region,
    forcePathStyle: true, // required for MinIO
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
  return cachedClient;
}

module.exports = { getMinioClient };
