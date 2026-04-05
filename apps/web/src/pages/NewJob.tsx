import { FormEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Languages, Image, Mic, Upload, Lock,
  ChevronRight, Sparkles, AlertCircle,
} from "lucide-react";
import * as jobsApi from "../api/jobs.api.js";
import { fetchUsage } from "../api/usage.api.js";
import { useAuth } from "../hooks/useAuth.js";

type JobKind = "summarise" | "translate" | "generate" | "transcribe";

const TABS: { id: JobKind; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "summarise",  label: "Summarise",  icon: FileText,  desc: "Content Intelligence" },
  { id: "translate",  label: "Translate",  icon: Languages, desc: "Language Translation" },
  { id: "generate",   label: "Image",      icon: Image,     desc: "Visual AI" },
  { id: "transcribe", label: "Transcribe", icon: Mic,       desc: "Audio Transcription" },
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

  const mSumText  = useMutation({ mutationFn: () => jobsApi.createSummariseText(sumText.trim()), onSuccess: go, onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed") });
  const mSumPdf   = useMutation({ mutationFn: () => { if (!sumFile) throw new Error("Choose a PDF"); return jobsApi.createSummarisePdf(sumFile); }, onSuccess: go, onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed") });
  const mTranslate= useMutation({ mutationFn: () => jobsApi.createTranslateJob(trText.trim(), targetLang.trim(), sourceLang.trim() || undefined), onSuccess: go, onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed") });
  const mGenerate = useMutation({ mutationFn: () => jobsApi.createGenerateImageJob(prompt.trim(), imageSize), onSuccess: go, onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed") });
  const mTranscribe=useMutation({ mutationFn: () => { if (!audioFile) throw new Error("Choose audio"); return jobsApi.createTranscribeAudio(audioFile); }, onSuccess: go, onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Failed") });

  const busy = mSumText.isPending || mSumPdf.isPending || mTranslate.isPending || mGenerate.isPending || mTranscribe.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (kind === "summarise") { sumMode === "text" ? mSumText.mutate() : mSumPdf.mutate(); return; }
    if (kind === "translate")  { mTranslate.mutate(); return; }
    if (kind === "generate")   { mGenerate.mutate(); return; }
    mTranscribe.mutate();
  }

  const activeTab = TABS.find(t => t.id === kind)!;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Create New Job</h1>
        <p className="text-gray-500 text-sm mt-1">Select an AI engine to process your request.</p>
        <p className="text-gray-500 text-sm mt-1">Remember In Free Plan Image is not available.</p>
      </div>

      <div className="flex gap-6">
        {/* Left: tab list */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-[#000000] border border-zinc-800 rounded-2xl p-2 flex flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const locked = tab.id === "generate" && isGenerateLocked;
              const active = kind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { if (!locked) setKind(tab.id); }}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer
                    ${active ? "bg-zinc-800/50 text-zinc-300 border border-zinc-700" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}
                    ${locked ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={15} />
                    {tab.label}
                  </span>
                  {locked && <Lock size={12} className="text-gray-600" />}
                  {active && !locked && <ChevronRight size={13} className="text-zinc-400" />}
                </button>
              );
            })}
          </div>

          {/* Usage */}
          {usage.data && (
            <div className="mt-4 bg-[#000000] border border-zinc-800 rounded-md p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                Usage: {usage.data.jobsCreatedToday} / {usage.data.dailyJobLimit} jobs
              </p>
              <div className="h-1.5 rounded-md bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-md bg-white transition-all duration-500"
                  style={{ width: `${Math.min(100, (usage.data.jobsCreatedToday / usage.data.dailyJobLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: form panel */}
        <div className="flex-1">
          {kind === "generate" && isGenerateLocked ? (
            <div className="bg-[#000000] border border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-80">
              <div className="w-16 h-16 rounded-2xl bg-white text-black hover:bg-zinc-900 border border-white/10 flex items-center justify-center mb-4">
                <Image size={28} className="text-zinc-400/50" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Visual AI Locked</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs">
                Upgrade to Pro to access high-fidelity image generation.
              </p>
              <button className="px-6 py-2.5 rounded-md bg-white text-black hover:bg-zinc-200 text-sm font-semibold transition-all">
                Upgrade to Pro
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="bg-[#000000] border border-zinc-800 rounded-2xl p-6">
              {/* Panel header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">{activeTab.desc}</h2>
                </div>
                <activeTab.icon size={40} className="text-white/5" />
              </div>

              {/* Summarise */}
              {kind === "summarise" && (
                <>
                  {/* Sub-tabs */}
                  <div className="flex gap-1 mb-4 bg-black rounded-md p-1 w-fit">
                    {(["text", "pdf"] as const).map(m => (
                      <button key={m} type="button" onClick={() => setSumMode(m)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-widest transition-all ${sumMode === m ? "bg-white text-black hover:bg-zinc-200" : "text-gray-500 hover:text-gray-300"}`}>
                        {m === "text" ? "Input Text" : "PDF Upload"}
                      </button>
                    ))}
                  </div>

                  {sumMode === "text" ? (
                    <>
                      <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Input Text</label>
                      <textarea
                        value={sumText}
                        onChange={e => setSumText(e.target.value)}
                        rows={9}
                        required
                        placeholder="Paste long-form content here..."
                        className="w-full bg-black border border-zinc-800 rounded-md px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-white/20 resize-none transition-all"
                      />
                    </>
                  ) : (
                    <>
                      <div
                        onClick={() => pdfRef.current?.click()}
                        className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-md p-10 flex flex-col items-center justify-center cursor-pointer transition-all group"
                      >
                        <Upload size={28} className="text-gray-600 group-hover:text-zinc-400 mb-3 transition-colors" />
                        <p className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
                          {sumFile ? sumFile.name : "Upload PDF Document"}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Maximum file size: 15MB</p>
                      </div>
                      <input ref={pdfRef} type="file" accept="application/pdf" className="hidden"
                        onChange={e => setSumFile(e.target.files?.[0] ?? null)} required />
                    </>
                  )}
                </>
              )}

              {/* Translate */}
              {kind === "translate" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Text to Translate</label>
                    <textarea value={trText} onChange={e => setTrText(e.target.value)} rows={7} required
                      placeholder="Enter text to translate..."
                      className="w-full bg-black border border-zinc-800 rounded-md px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-zinc-600 resize-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Target Language</label>
                      <input value={targetLang} onChange={e => setTargetLang(e.target.value)} required placeholder="e.g. French, Spanish"
                        className="w-full bg-black border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-zinc-600 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Source Language <span className="text-gray-700">(optional)</span></label>
                      <input value={sourceLang} onChange={e => setSourceLang(e.target.value)} placeholder="Auto-detect"
                        className="w-full bg-black border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-zinc-600 transition-all" />
                    </div>
                  </div>
                </div>
              )}

              {/* Generate */}
              {kind === "generate" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Image Prompt</label>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} required maxLength={4000}
                      placeholder="Describe the image you want to generate..."
                      className="w-full bg-black border border-zinc-800 rounded-md px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-zinc-600 resize-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Size</label>
                    <div className="flex gap-2">
                      {(["1024x1024", "1792x1024", "1024x1792"] as jobsApi.ImageSize[]).map(s => (
                        <button key={s} type="button" onClick={() => setImageSize(s)}
                          className={`flex-1 py-2 rounded-md text-xs font-semibold border transition-all ${imageSize === s ? "border-zinc-600 bg-zinc-800/50 text-zinc-300" : "border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/20"}`}>
                          {s === "1024x1024" ? "Square" : s === "1792x1024" ? "Landscape" : "Portrait"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Transcribe */}
              {kind === "transcribe" && (
                <div
                  onClick={() => audioRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-md p-10 flex flex-col items-center justify-center cursor-pointer transition-all group"
                >
                  <Upload size={28} className="text-gray-600 group-hover:text-zinc-400 mb-3 transition-colors" />
                  <p className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
                    {audioFile ? audioFile.name : "Upload Audio File"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">mp3, wav, m4a, webm, ogg — max 25MB</p>
                  <input ref={audioRef} type="file" accept="audio/*" className="hidden"
                    onChange={e => setAudioFile(e.target.files?.[0] ?? null)} required />
                </div>
              )}

              {err && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  <AlertCircle size={13} />
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-md bg-white text-black hover:bg-zinc-200 disabled:opacity-60 font-semibold text-sm transition-all duration-150 "
              >
                {busy ? (
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-md bg-white pulse-dot" style={{ animationDelay: `${i*0.15}s` }} />
                    ))}
                  </span>
                ) : (
                  <> Submit Job</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
