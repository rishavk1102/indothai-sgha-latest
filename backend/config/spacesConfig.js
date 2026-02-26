const {
  S3Client
} = require('@aws-sdk/client-s3');
const {
  Endpoint
} = require('@aws-sdk/types');

// Configure the AWS SDK v3 to use DigitalOcean Spaces
const spacesEndpoint = process.env.SPACES_ENDPOINT; // e.g. nyc3.digitaloceanspaces.com

const s3Client = new S3Client({
  endpoint: spacesEndpoint, // Add the endpoint as a full URL string
  region: 'blr1', // DigitalOcean Spaces uses "us-east-1" region
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY,
  },
});

module.exports = s3Client;