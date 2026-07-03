import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Sparkles } from "lucide-react";

interface UploadPanelProps {
  onAnalyze: (file: File | null, useDemo: boolean) => void;
}

export function UploadPanel({ onAnalyze }: UploadPanelProps) {
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      onAnalyze(file, false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      onAnalyze(file, false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Agentic AI spend audit
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          AI Stack Auditor
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
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
        onDrop={handleDrop}
        animate={{
          scale: drag ? 1.01 : 1,
          borderColor: drag ? "var(--accent)" : "var(--border)",
        }}
        transition={{ duration: 0.15 }}
        className="flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-card px-8 py-16 text-center shadow-lg"
      >
        <UploadCloud className="mb-4 h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">
          Drag &amp; drop your CSV, XLSX, or PDF invoice export
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">or</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.pdf,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-border bg-muted/20 px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
          >
            Choose file
          </button>
          <button
            onClick={() => onAnalyze(null, true)}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-accent/15 transition hover:bg-accent/90"
          >
            Use Demo Dataset →
          </button>
        </div>
      </motion.div>

      <p className="mt-6 text-xs text-muted-foreground/60">
        Demo dataset triggers the full sequential agent tracing pipeline.
      </p>
    </div>
  );
}
