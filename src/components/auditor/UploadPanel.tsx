import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Sparkles } from "lucide-react";

export function UploadPanel({ onAnalyze }: { onAnalyze: () => void }) {
  const [drag, setDrag] = useState(false);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Agentic AI spend audit
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          AI Stack Auditor
        </h1>
        <p className="mt-3 text-base text-white/60">
          Upload your SaaS invoice export. We&apos;ll find overlapping, underused, and
          overpriced AI subscriptions — and tell you exactly what to cut.
        </p>
      </motion.div>

      <motion.div
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
        }}
        animate={{
          scale: drag ? 1.01 : 1,
          borderColor: drag ? "rgb(34 217 122 / 0.6)" : "rgb(255 255 255 / 0.12)",
        }}
        transition={{ duration: 0.15 }}
        className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white/[0.02] px-8 py-16 text-center"
      >
        <UploadCloud className="mb-4 h-10 w-10 text-white/40" />
        <p className="text-sm text-white/70">
          Drag &amp; drop your CSV, XLSX, or PDF invoice export
        </p>
        <p className="mt-1 text-xs text-white/40">or</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onAnalyze}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            Choose file
          </button>
          <button
            onClick={onAnalyze}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent/90"
          >
            Use Demo Dataset →
          </button>
        </div>
      </motion.div>

      <p className="mt-6 text-xs text-white/40">
        Prototype: no files are uploaded. Demo dataset triggers the full flow.
      </p>
    </div>
  );
}
