import type { Request, Response } from "express";
import type { UserPlan } from "@ai-task-runner/shared";
import { createJobBodySchema } from "./jobs.schemas.js";
import {
  createSummariseJobFromPdf,
  createTranscribeJobFromAudio,
  getJob,
  listJobs,
  removeJob,
  retryJob,
  createJob,
} from "./jobs.service.js";

function plan(req: Request): UserPlan {
  return req.user!.plan;
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = createJobBodySchema.parse(req.body);
  const job = await createJob(
    req.user!.id,
    plan(req),
    body.type,
    body.payload,
  );
  res.status(201).json(job);
}

export async function createSummarisePdf(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Missing file field `file` (PDF)" });
    return;
  }
  const job = await createSummariseJobFromPdf(req.user!.id, plan(req), file);
  res.status(201).json(job);
}

export async function createTranscribeAudio(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Missing file field `file` (audio)" });
    return;
  }
  const job = await createTranscribeJobFromAudio(req.user!.id, plan(req), file);
  res.status(201).json(job);
}

export async function list(req: Request, res: Response): Promise<void> {
  const take = Math.min(
    100,
    Math.max(1, Number(req.query.take) || 20),
  );
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const result = await listJobs(req.user!.id, take, skip);
  res.json(result);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const job = await getJob(req.user!.id, req.params.id);
  res.json(job);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const result = await removeJob(req.user!.id, req.params.id);
  res.json(result);
}

export async function retry(req: Request, res: Response): Promise<void> {
  const job = await retryJob(req.user!.id, req.params.id);
  res.json(job);
}
