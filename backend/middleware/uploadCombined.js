const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // Max 15MB per file
});

const combinedUpload = upload.fields([
  { name: 'profile_image', maxCount: 1 },
  { name: 'documents', maxCount: 2 }, // allow max 2 docs
]);

module.exports = combinedUpload;
