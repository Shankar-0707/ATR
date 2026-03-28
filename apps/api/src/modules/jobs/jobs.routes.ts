import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import * as jobsController from "./jobs.controller.js";
import { audioUpload, pdfUpload } from "./multer.config.js";

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

jobsRouter.post(
  "/summarise",
  pdfUpload.single("file"),
  (req, res, next) => {
    void jobsController.createSummarisePdf(req, res).catch(next);
  },
);
jobsRouter.post(
  "/transcribe",
  audioUpload.single("file"),
  (req, res, next) => {
    void jobsController.createTranscribeAudio(req, res).catch(next);
  },
);
jobsRouter.post("/", (req, res, next) => {
  void jobsController.create(req, res).catch(next);
});
jobsRouter.get("/", (req, res, next) => {
  void jobsController.list(req, res).catch(next);
});
jobsRouter.get("/:id", (req, res, next) => {
  void jobsController.getOne(req, res).catch(next);
});
jobsRouter.delete("/:id", (req, res, next) => {
  void jobsController.remove(req, res).catch(next);
});
jobsRouter.post("/:id/retry", (req, res, next) => {
  void jobsController.retry(req, res).catch(next);
});
