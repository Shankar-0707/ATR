import { useState, useRef, useEffect, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, X, Send, Bot, User, Upload, ArrowRight, Loader2, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as chatApi from "../api/chat.api.js";
import * as jobsApi from "../api/jobs.api.js";
import { useAuth } from "../hooks/useAuth.js";

type ChatState = "idle" | "awaiting_file" | "polling";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
};

export function ChatWidget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ChatState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  
  // Current intent context
  const [intent, setIntent] = useState<chatApi.ChatIntentResponse | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Polling for job completion
  const { data: jobStatus } = useQuery({
    queryKey: ["jobs", "one", activeJobId],
    queryFn: () => jobsApi.getJob(activeJobId!),
    enabled: state === "polling" && !!activeJobId,
    refetchInterval: (query) => {
      const st = query.state.data?.status;
      return st === "completed" || st === "failed" || st === "dead" ? false : 3000;
    },
  });

  // Handle completion state
  useEffect(() => {
    if (state === "polling" && jobStatus) {
      if (jobStatus.status === "completed") {
        addMessage("bot", `✅ Job completed successfully!`);
        setState("idle");
        setActiveJobId(null);
        setIntent(null);
        void qc.invalidateQueries({ queryKey: ["jobs"] });
        void qc.invalidateQueries({ queryKey: ["usage"] });
      } else if (jobStatus.status === "failed" || jobStatus.status === "dead") {
        addMessage("bot", `❌ Job failed due to some error. Try again later.`);
        setState("idle");
        setActiveJobId(null);
        setIntent(null);
      }
    }
  }, [state, jobStatus, qc]);

  function addMessage(role: "user" | "bot", content: string) {
    setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), role, content }]);
  }

  // Talk to Gemini
  const mChat = useMutation({
    mutationFn: (msg: string) => chatApi.sendChatMessage(msg),
    onSuccess: (data) => {
      addMessage("bot", data.message);
      
      if (data.jobType === "unknown") {
        setState("idle");
        return;
      }

      setIntent(data);

      if (data.needsFile) {
        setState("awaiting_file");
      } else {
        // Automatically submit non-file jobs
        if (data.jobType === "translate") {
          mTranslate.mutate(data);
        } else if (data.jobType === "generate") {
          if (user?.plan === "free") {
            addMessage("bot", "⚠️ Visual AI is locked on the Free plan. Upgrade to Pro to use this feature.");
            setState("idle");
            setIntent(null);
          } else {
            mGenerate.mutate(data);
          }
        }
      }
    },
    onError: (err) => {
      addMessage("bot", `Error: ${err instanceof Error ? err.message : "Failed to parse intent."}`);
    }
  });

  // Process File uploads
  const mUploadPdf = useMutation({
    mutationFn: (file: File) => jobsApi.createSummarisePdf(file),
    onSuccess: (job) => {
      setActiveJobId(job.id);
      setState("polling");
      addMessage("bot", "File uploaded successfully! Processing the job now...");
    },
    onError: (e: unknown) => {
      addMessage("bot", `Upload failed: ${e instanceof Error ? e.message : "Internal error"}`);
      setState("idle");
      setIntent(null);
    }
  });

  const mUploadAudio = useMutation({
    mutationFn: (file: File) => jobsApi.createTranscribeAudio(file),
    onSuccess: (job) => {
      setActiveJobId(job.id);
      setState("polling");
      addMessage("bot", "Audio uploaded successfully! Processing the job now...");
    },
    onError: (e: unknown) => {
      addMessage("bot", `Upload failed: ${e instanceof Error ? e.message : "Internal error"}`);
      setState("idle");
      setIntent(null);
    }
  });

  // Non-file job executors
  const mTranslate = useMutation({
    mutationFn: (data: chatApi.ChatIntentResponse) => 
      jobsApi.createTranslateJob("Please provide text in the next step via normal UI (Chat doesn't support long text yet)", data.targetLang || "English", data.sourceLang),
    onSuccess: (job) => {
      addMessage("bot", "Job queued! I'm tracking it now...");
      setActiveJobId(job.id);
      setState("polling");
    },
    onError: (e) => {
      addMessage("bot", `Failed to queue: ${e instanceof Error ? e.message : "Error"}`);
      setState("idle");
    }
  });

  const mGenerate = useMutation({
    mutationFn: (data: chatApi.ChatIntentResponse) => 
      jobsApi.createGenerateImageJob(data.prompt || "A nice image", "1024x1024"),
    onSuccess: (job) => {
      addMessage("bot", "Drawing image! I'm tracking it now...");
      setActiveJobId(job.id);
      setState("polling");
    },
    onError: (e) => {
      addMessage("bot", `Failed to generate: ${e instanceof Error ? e.message : "Error"}`);
      setState("idle");
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state !== "idle") return;

    const msg = input.trim();
    setInput("");
    addMessage("user", msg);
    mChat.mutate(msg);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !intent) return;

    if (intent.jobType === "summarise") {
      mUploadPdf.mutate(file);
    } else if (intent.jobType === "transcribe") {
      mUploadAudio.mutate(file);
    }
    
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl shadow-white/10 transition-transform hover:scale-105 active:scale-95"
      >
        <Bot size={24} className="text-black" />
        {state === "polling" && (
          <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl slide-in sm:w-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-white" />
          <h3 className="text-sm font-semibold text-white">TaskPilot AI</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300">
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
            <MessageSquare size={32} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">How can I help you today?</p>
            <p className="mt-1 text-xs">Try: "Summarize this PDF for me" or "Transcribe my audio file"</p>
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-zinc-800" : "bg-white"}`}>
                {msg.role === "user" ? <User size={14} className="text-white" /> : <Bot size={14} className="text-black" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user" 
                  ? "bg-zinc-800 text-white rounded-tr-sm" 
                  : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {mChat.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <Bot size={14} className="text-black" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-500 pulse-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          
          {state === "polling" && jobStatus && (
            <div className="flex gap-3">
               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <Bot size={14} className="text-black" />
              </div>
              <div className="flex max-w-[80%] items-center gap-3 rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
                <Loader2 size={16} className="animate-spin text-zinc-400" />
                <div className="flex flex-col">
                  <span className="font-medium text-white capitalize">{jobStatus.type} Job Running...</span>
                  <span className="text-xs text-zinc-500">Checking status...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Upload Action Area */}
      {state === "awaiting_file" && (
        <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
           <button 
             onClick={() => fileInputRef.current?.click()}
             disabled={mUploadPdf.isPending || mUploadAudio.isPending}
             className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
           >
             {mUploadPdf.isPending || mUploadAudio.isPending ? (
               <Loader2 size={16} className="animate-spin" />
             ) : (
               <Upload size={16} />
             )}
             Select File to {intent?.jobType}
           </button>
           <input 
             type="file" 
             className="hidden" 
             ref={fileInputRef} 
             accept={intent?.jobType === "summarise" ? ".pdf" : "audio/*"}
             onChange={handleFileUpload} 
           />
           <button 
             onClick={() => { setState("idle"); setIntent(null); }}
             className="mt-2 w-full text-center text-xs text-zinc-500 hover:text-white transition-colors"
           >
             Cancel
           </button>
        </div>
      )}

      {/* Completed Action Area */}
      {jobStatus?.status === "completed" && activeJobId === null && jobStatus.id && (
        <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
           <button 
             onClick={() => nav(`/jobs/${jobStatus.id}`)}
             className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
           >
             <Play size={16} className="fill-black" />
             View Result
             <ArrowRight size={16} />
           </button>
        </div>
      )}

      {/* Input Area */}
      {state === "idle" && (
        <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask TaskPilot to do something..."
              className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-3 pl-4 pr-12 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || mChat.isPending}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
            >
              <Send size={14} className="ml-0.5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
