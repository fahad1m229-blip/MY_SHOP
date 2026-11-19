const crypto = require("crypto");
const multer = require("multer");
const { getStorageBucket } = require("../config/firebase");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max per image
    files: 8,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported image format. Allowed: JPG, JPEG, PNG, WebP."));
    }
  },
});

async function uploadBufferToFirebaseStorage(file, folder = "catalog/products") {
  const bucket = getStorageBucket();
  const ext = file.mimetype.includes("png")
    ? "png"
    : file.mimetype.includes("webp")
    ? "webp"
    : "jpg";
  const filename = `${folder}/${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const downloadToken = crypto.randomUUID();
  const storageFile = bucket.file(filename);

  await storageFile.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  const encodedPath = encodeURIComponent(filename);
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  return {
    path: filename,
    url: publicUrl,
    contentType: file.mimetype,
    sizeBytes: file.size,
  };
}

module.exports = {
  uploadMiddleware,
  uploadBufferToFirebaseStorage,
};
