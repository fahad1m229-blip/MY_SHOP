const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { getStorageBucket } = require("../config/firebase");

const LOCAL_UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

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

async function saveBufferToLocalFallback(file, folder = "catalog/products") {
  const ext = file.mimetype.includes("png")
    ? "png"
    : file.mimetype.includes("webp")
    ? "webp"
    : "jpg";
  const safeFolder = String(folder || "catalog/products").replace(/[^a-zA-Z0-9/_-]/g, "_");
  const relPath = `${safeFolder}/${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const fullPath = path.join(LOCAL_UPLOADS_DIR, relPath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, file.buffer);
  return {
    path: relPath,
    url: `/uploads/${relPath}`,
    storage: "local",
    contentType: file.mimetype,
    sizeBytes: file.size,
  };
}

async function uploadBufferToFirebaseStorage(file, folder = "catalog/products") {
  const ext = file.mimetype.includes("png")
    ? "png"
    : file.mimetype.includes("webp")
    ? "webp"
    : "jpg";
  const filename = `${folder}/${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${ext}`;

  try {
    const bucket = getStorageBucket();
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
      storage: "firebase",
      contentType: file.mimetype,
      sizeBytes: file.size,
    };
  } catch (err) {
    console.warn("[Storage] Firebase Storage upload unavailable, saving to server /uploads fallback:", err.message);
    return saveBufferToLocalFallback(file, folder);
  }
}

async function deleteUploadedAssetIfOwned(url) {
  if (!url || typeof url !== "string") return;
  try {
    if (url.startsWith("/uploads/") && !url.includes("..")) {
      const target = path.join(LOCAL_UPLOADS_DIR, url.replace(/^\/uploads\//, ""));
      if (target.startsWith(LOCAL_UPLOADS_DIR) && fs.existsSync(target)) {
        await fs.promises.unlink(target);
      }
      return;
    }
    if (url.includes("firebasestorage.googleapis.com/v0/b/")) {
      const m = url.match(/\/o\/([^?]+)/);
      if (!m) return;
      const objectPath = decodeURIComponent(m[1]);
      if (objectPath.startsWith("catalog/")) {
        const bucket = getStorageBucket();
        await bucket.file(objectPath).delete({ ignoreNotFound: true });
      }
    }
  } catch {
    // Non-fatal cleanup
  }
}

module.exports = {
  LOCAL_UPLOADS_DIR,
  uploadMiddleware,
  uploadBufferToFirebaseStorage,
  deleteUploadedAssetIfOwned,
};
