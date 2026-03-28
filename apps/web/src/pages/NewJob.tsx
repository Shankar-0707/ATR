import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as jobsApi from "../api/jobs.api.js";

type JobKind = "summarise" | "translate" | "generate" | "transcribe";

export function NewJob() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [kind, setKind] = useState<JobKind>("summarise");
  const [sumMode, setSumMode] = useState<"text" | "pdf">("text");
  const [sumText, setSumText] = useState("");
  const [sumFile, setSumFile] = useState<File | null>(null);
  const [trText, setTrText] = useState("");
  const [targetLang, setTargetLang] = useState("French");
  const [sourceLang, setSourceLang] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageSize, setImageSize] = useState<jobsApi.ImageSize>("1024x1024");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const go = (job: { id: string }) => {
    void qc.invalidateQueries({ queryKey: ["jobs"] });
    nav(`/jobs/${job.id}`);
  };

  const mSummariseText = useMutation({
    mutationFn: () => jobsApi.createSummariseText(sumText.trim()),
    onSuccess: go,
    onError: (e: unknown) =>
      setErr(e instanceof Error ? e.message : "Request failed"),
  });

  const mSummarisePdf = useMutation({
    mutationFn: () => {
      if (!sumFile) {
        throw new Error("Choose a PDF file");
      }
      return jobsApi.createSummarisePdf(sumFile);
    },
    onSuccess: go,
    onError: (e: unknown) =>
      setErr(e instanceof Error ? e.message : "Request failed"),
  });

  const mTranslate = useMutation({
    mutationFn: () =>
      jobsApi.createTranslateJob(
        trText.trim(),
        targetLang.trim(),
        sourceLang.trim() || undefined,
      ),
    onSuccess: go,
    onError: (e: unknown) =>
      setErr(e instanceof Error ? e.message : "Request failed"),
  });

  const mGenerate = useMutation({
    mutationFn: () => jobsApi.createGenerateImageJob(prompt.trim(), imageSize),
    onSuccess: go,
    onError: (e: unknown) =>
      setErr(e instanceof Error ? e.message : "Request failed"),
  });

  const mTranscribe = useMutation({
    mutationFn: () => {
      if (!audioFile) {
        throw new Error("Choose an audio file");
      }
      return jobsApi.createTranscribeAudio(audioFile);
    },
    onSuccess: go,
    onError: (e: unknown) =>
      setErr(e instanceof Error ? e.message : "Request failed"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (kind === "summarise") {
      if (sumMode === "text") {
        mSummariseText.mutate();
      } else {
        mSummarisePdf.mutate();
      }
      return;
    }
    if (kind === "translate") {
      mTranslate.mutate();
      return;
    }
    if (kind === "generate") {
      mGenerate.mutate();
      return;
    }
    mTranscribe.mutate();
  }

  const busy =
    mSummariseText.isPending ||
    mSummarisePdf.isPending ||
    mTranslate.isPending ||
    mGenerate.isPending ||
    mTranscribe.isPending;

  return (
    <div className="page narrow">
      <h1>New job</h1>
      <p className="muted small">
        Summarise (text/PDF), translate text, generate an image from a prompt, or
        transcribe audio (upload).
      </p>

      <div className="tabs job-kind-tabs">
        <button
          type="button"
          className={kind === "summarise" ? "tab active" : "tab"}
          onClick={() => setKind("summarise")}
        >
          Summarise
        </button>
        <button
          type="button"
          className={kind === "translate" ? "tab active" : "tab"}
          onClick={() => setKind("translate")}
        >
          Translate
        </button>
        <button
          type="button"
          className={kind === "generate" ? "tab active" : "tab"}
          onClick={() => setKind("generate")}
        >
          Image
        </button>
        <button
          type="button"
          className={kind === "transcribe" ? "tab active" : "tab"}
          onClick={() => setKind("transcribe")}
        >
          Transcribe
        </button>
      </div>

      <form className="form" onSubmit={onSubmit}>
        {kind === "summarise" ? (
          <>
            <div className="tabs">
              <button
                type="button"
                className={sumMode === "text" ? "tab active" : "tab"}
                onClick={() => setSumMode("text")}
              >
                Text
              </button>
              <button
                type="button"
                className={sumMode === "pdf" ? "tab active" : "tab"}
                onClick={() => setSumMode("pdf")}
              >
                PDF
              </button>
            </div>
            {sumMode === "text" ? (
              <label>
                Text to summarise
                <textarea
                  value={sumText}
                  onChange={(e) => setSumText(e.target.value)}
                  rows={10}
                  required
                  minLength={1}
                  placeholder="Paste document text…"
                />
              </label>
            ) : (
              <label>
                PDF (max 15 MB)
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSumFile(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
            )}
          </>
        ) : null}

        {kind === "translate" ? (
          <>
            <label>
              Text to translate
              <textarea
                value={trText}
                onChange={(e) => setTrText(e.target.value)}
                rows={8}
                required
                minLength={1}
              />
            </label>
            <label>
              Target language
              <input
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                required
                placeholder="e.g. French, es, de"
              />
            </label>
            <label>
              Source language (optional)
              <input
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                placeholder="e.g. English — leave empty to auto-detect"
              />
            </label>
          </>
        ) : null}

        {kind === "generate" ? (
          <>
            <label>
              Image prompt
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                required
                minLength={1}
                maxLength={4000}
                placeholder="Describe the image to generate (DALL·E 3)…"
              />
            </label>
            <label>
              Size
              <select
                value={imageSize}
                onChange={(e) =>
                  setImageSize(e.target.value as jobsApi.ImageSize)
                }
              >
                <option value="1024x1024">1024×1024</option>
                <option value="1792x1024">1792×1024 (landscape)</option>
                <option value="1024x1792">1024×1792 (portrait)</option>
              </select>
            </label>
          </>
        ) : null}

        {kind === "transcribe" ? (
          <label>
            Audio file (max ~25 MB; mp3, wav, m4a, webm, ogg)
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
        ) : null}

        {err ? <p className="error">{err}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Enqueue job"}
        </button>
      </form>
    </div>
  );
}
