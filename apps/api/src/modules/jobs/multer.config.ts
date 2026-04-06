import multer from "multer";

/** Max PDF size for summarise uploads (15 MiB). */
export const PDF_MAX_BYTES = 15 * 1024 * 1024;

/** Upload limit aligned with worker Gemini inline audio cap (20 MiB). */
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;

const AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
]);

export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PDF_MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!file.originalname.toLowerCase().endsWith(".pdf") && file.mimetype !== "application/pdf") {
      cb(new Error("Only application/pdf is allowed"));
      return;
    }
    cb(null, true);
  },
});

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!AUDIO_MIMES.has(file.mimetype)) {
      cb(
        new Error(
          "Only common audio types are allowed (e.g. mp3, wav, m4a, webm, ogg)",
        ),
      );
      return;
    }
    cb(null, true);
  },
});
