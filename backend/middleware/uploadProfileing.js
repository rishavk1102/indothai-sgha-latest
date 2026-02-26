const multer = require('multer');
const path = require('path');

// Storage setup for multer (memory storage to handle upload temporarily)
const storage = multer.memoryStorage();

const uploadProfileimg = multer({
  storage,
  limits: { fileSize: 300 * 1024 }, // 300 KB size limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Images only! (JPEG, JPG, PNG)'));
    }
  },
});

module.exports = uploadProfileimg;

