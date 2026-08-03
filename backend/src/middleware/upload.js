const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { AppError } = require('./errorHandler');

const TIPOS_PERMITIDOS = {
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/webp': 'imagen',
  'application/pdf': 'pdf',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Nombre aleatorio: nunca confiar en el nombre original del archivo
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueName}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!TIPOS_PERMITIDOS[file.mimetype]) {
    return cb(new AppError(`Tipo de archivo no permitido: ${file.mimetype}`, 400));
  }
  cb(null, true);
}

const maxMb = parseInt(process.env.MAX_UPLOAD_MB || '10', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024 },
});

function tipoArchivoDeMime(mimetype) {
  return TIPOS_PERMITIDOS[mimetype] || 'documento';
}

module.exports = { upload, tipoArchivoDeMime };
