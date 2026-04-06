import { FormEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  Image,
  Languages,
  Lock,
  Mic,
  Upload,
} from "lucide-react";
import * as jobsApi from "../api/jobs.api.js";
import { fetchUsage } from "../api/usage.api.js";
import { useAuth } from "../hooks/useAuth.js";

type JobKind = "summarise" | "translate" | "generate" | "transcribe";

const TABS: { id: JobKind; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "summarise", label: "Summarise", icon: FileText, desc: "Content Intelligence" },
  { id: "translate", label: "Translate", icon: Languages, desc: "Language Translation" },
  { id: "generate", label: "Image", icon: Image, desc: "Visual AI" },
  { id: "transcribe", label: "Transcribe", icon: Mic, desc: "Audio Transcription" },
];

export function NewJob() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const usage = useQuery({ queryKey: ["usage"], queryFn: fetchUsage, enabled: Boolean(user) });

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
  const pdfRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const isFree = user?.plan === "free";
  const isGenerateLocked = isFree;

  const go = (job: { id: string }) => {
    void qc.invalidateQueries({ queryKey: ["jobs"] });
    void qc.invalidateQueries({ queryKey: ["usage"] });
    nav(`/jobs/${job.id}`);
  };

  const mSumText = useMutation({
    mutationFn: () => jobsApi.createSummariseText(sumText.trim()),
    onSuccess: go,
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const mSumPdf = useMutation({
    mutationFn: () => {
      if (!sumFile) throw new Error("Please select a PDF file first");
      return jobsApi.createSummarisePdf(sumFile);
    },
    onSuccess: go,
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const mTranslate = useMutation({
    mutationFn: () =>
      jobsApi.createTranslateJob(trText.trim(), targetLang.trim(), sourceLang.trim() || undefined),
    onSuccess: go,
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const mGenerate = useMutation({
    mutationFn: () => jobsApi.createGenerateImageJob(prompt.trim(), imageSize),
    onSuccess: go,
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const mTranscribe = useMutation({
    mutationFn: () => {
      if (!audioFile) throw new Error("Please select an audio file first");
      return jobsApi.createTranscribeAudio(audioFile);
    },
    onSuccess: go,
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed"),
  });

  const busy =
    mSumText.isPending ||
    mSumPdf.isPending ||
    mTranslate.isPending ||
    mGenerate.isPending ||
    mTranscribe.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (kind === "summarise") {
      sumMode === "text" ? mSumText.mutate() : mSumPdf.mutate();
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

  const activeTab = TABS.find((t) => t.id === kind)!;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Create New Job</h1>
        <p className="mt-1 text-sm text-gray-500">Select an AI engine to process your request.</p>
        <p className="mt-1 text-sm text-gray-500">Remember in Free Plan image generation is not available.</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full flex-shrink-0 lg:w-56">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-zinc-800 bg-[#000000] p-2 sm:grid-cols-4 lg:flex lg:flex-col">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const locked = tab.id === "generate" && isGenerateLocked;
              const active = kind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (!locked) setKind(tab.id);
                  }}
                  className={`w-full cursor-pointer rounded-xl px-3 py-3 text-sm font-medium transition-all duration-150
                    ${active ? "border border-zinc-700 bg-zinc-800/50 text-zinc-300" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}
                    ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon size={15} />
                      {tab.label}
                    </span>
                    {locked && <Lock size={12} className="text-gray-600" />}
                    {active && !locked && <ChevronRight size={13} className="hidden text-zinc-400 lg:block" />}
                  </span>
                </button>
              );
            })}
          </div>

          {usage.data && (
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-[#000000] p-4">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-500">
                Usage: {usage.data.jobsCreatedToday} / {usage.data.dailyJobLimit} jobs
              </p>
              <div className="h-1.5 overflow-hidden rounded-md bg-white/10">
                <div
                  className="h-full rounded-md bg-white transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (usage.data.jobsCreatedToday / usage.data.dailyJobLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1">
          {kind === "generate" && isGenerateLocked ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-[#000000] p-6 text-center sm:p-10">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white text-black">
                <Image size={28} className="text-zinc-400/50" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Visual AI Locked</h3>
              <p className="mb-6 max-w-xs text-sm text-gray-500">
                Upgrade to Pro to access high-fidelity image generation.
              </p>
              <button className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-zinc-200">
                Upgrade to Pro
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-800 bg-[#000000] p-4 sm:p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{activeTab.desc}</h2>
                </div>
                <activeTab.icon size={34} className="text-white/5 sm:size-10" />
              </div>

              {kind === "summarise" && (
                <>
                  <div className="mb-4 grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl bg-black p-1">
                    {(["text", "pdf"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSumMode(m)}
                        className={`rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all sm:px-4 sm:py-1.5 ${
                          sumMode === m ? "bg-white text-black hover:bg-zinc-200" : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {m === "text" ? "Input Text" : "PDF Upload"}
                      </button>
                    ))}
                  </div>

                  {sumMode === "text" ? (
                    <>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                        Input Text
                      </label>
                      <textarea
                        value={sumText}
                        onChange={(e) => setSumText(e.target.value)}
                        rows={9}
                        required
                        placeholder="Paste long-form content here..."
                        className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-gray-300 placeholder-gray-700 transition-all focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                      />
                    </>
                  ) : (
                    <>
                      <div
                        onClick={() => pdfRef.current?.click()}
                        className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 p-8 text-center transition-all hover:border-zinc-700 sm:p-10"
                      >
                        <Upload size={28} className="mb-3 text-gray-600 transition-colors group-hover:text-zinc-400" />
                        <p className="text-sm font-medium text-gray-400 transition-colors group-hover:text-gray-200">
                          {sumFile ? sumFile.name : "Upload PDF Document"}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">Maximum file size: 15MB</p>
                      </div>
                      <input
                        ref={pdfRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setSumFile(e.target.files?.[0] ?? null)}
                      />
                    </>
                  )}
                </>
              )}

              {kind === "translate" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                      Text to Translate
                    </label>
                    <textarea
                      value={trText}
                      onChange={(e) => setTrText(e.target.value)}
                      rows={7}
                      required
                      placeholder="Enter text to translate..."
                      className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-gray-300 placeholder-gray-700 transition-all focus:border-zinc-600 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                        Target Language
                      </label>
                      <input
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        required
                        placeholder="e.g. French, Spanish"
                        className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-gray-300 placeholder-gray-700 transition-all focus:border-zinc-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                        Source Language <span className="text-gray-700">(optional)</span>
                      </label>
                      <input
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        placeholder="Auto-detect"
                        className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-gray-300 placeholder-gray-700 transition-all focus:border-zinc-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {kind === "generate" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                      Image Prompt
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={6}
                      required
                      maxLength={4000}
                      placeholder="Describe the image you want to generate..."
                      className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-gray-300 placeholder-gray-700 transition-all focus:border-zinc-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                      Size
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {(["1024x1024", "1792x1024", "1024x1792"] as jobsApi.ImageSize[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setImageSize(s)}
                          className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                            imageSize === s
                              ? "border-zinc-600 bg-zinc-800/50 text-zinc-300"
                              : "border-white/8 text-gray-500 hover:border-white/20 hover:text-gray-300"
                          }`}
                        >
                          {s === "1024x1024" ? "Square" : s === "1792x1024" ? "Landscape" : "Portrait"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {kind === "transcribe" && (
                <div
                  onClick={() => audioRef.current?.click()}
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 p-8 text-center transition-all hover:border-zinc-700 sm:p-10"
                >
                  <Upload size={28} className="mb-3 text-gray-600 transition-colors group-hover:text-zinc-400" />
                  <p className="text-sm font-medium text-gray-400 transition-colors group-hover:text-gray-200">
                    {audioFile ? audioFile.name : "Upload Audio File"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">mp3, wav, m4a, webm, ogg - max 25MB</p>
                  <input
                    ref={audioRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              {err && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black transition-all duration-150 hover:bg-zinc-200 disabled:opacity-60 sm:rounded-md"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-black pulse-dot"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                ) : (
                  <>Submit Job</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
