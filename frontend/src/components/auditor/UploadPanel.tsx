import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";

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
    <div className="relative min-h-[85vh] w-full flex flex-col items-center justify-start pt-16 px-6 overflow-hidden">
      
      {/* Receding Perspective Grid Floor */}
      <div className="perspective-grid-container">
        <div className="perspective-grid" />
      </div>

      {/* Main Header Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center relative z-10 select-none max-w-4xl w-full"
      >
        <h1 
          className="text-[70px] tracking-tight text-[#1E1E1E] dark:text-[#FFFFFF] mb-4 text-center"
          style={{
            fontFamily: "'Product Sans Medium', 'Product Sans', sans-serif",
            fontWeight: 500,
            lineHeight: "100%",
            letterSpacing: "0%"
          }}
        >
          AI Stack Auditor
        </h1>
        <p 
          className="text-[20px] max-w-3xl mx-auto leading-none text-center"
          style={{
            fontFamily: "'Product Sans', sans-serif",
            fontWeight: 400,
            lineHeight: "125%",
            letterSpacing: "0%",
            color: "#797979"
          }}
        >
          Upload your SaaS invoice export. We&apos;ll find overlapping, underused, and overpriced<br className="hidden md:inline" />
          AI Subscriptions and tell you exactly, where to make the change!
        </p>
      </motion.div>

      {/* Upload Box Container Wrapper with Corner Dots and Crisp SVG Border */}
      <div className="relative w-[883px] h-[363px] z-10" style={{ filter: 'drop-shadow(0 25px 15px rgba(0, 0, 0, 0.08))' }}>
        {/* Upload Box Content Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          className="upload-box-content flex flex-col items-center justify-center p-8 cursor-default absolute inset-0 w-full h-full"
        >
          <UploadCloud className="mb-5 h-12 w-12 text-muted-foreground/40" />
          <p 
            className="text-[14px] text-foreground mb-1"
            style={{
              fontFamily: "'Product Sans', sans-serif",
              fontWeight: 400
            }}
          >
            Drag &amp; drop your CSV, XLSX, or PDF invoice export
          </p>
          <p 
            className="text-[12px] text-muted-foreground/60 mb-5"
            style={{
              fontFamily: "'Product Sans', sans-serif",
              fontWeight: 400
            }}
          >
            or
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx,.pdf,.txt"
              className="hidden"
            />
            {/* Choose File (Double-slant inactive style, width: 128px, height: 37px, bg: #121212) */}
            <div className="choose-file-border">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="choose-file-content cursor-pointer"
              >
                Choose File
              </button>
            </div>

            {/* Use Demo Dataset (Active tab style with slanted cuts, height: 37px) */}
            <div className="nav-tab-border h-[37px] flex items-center">
              <button
                onClick={() => onAnalyze(null, true)}
                className="nav-tab-content px-6 h-full transition cursor-pointer nav-tab-active flex items-center justify-center font-medium"
                style={{
                  fontFamily: "'Product Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  height: "100%"
                }}
              >
                Use Demo Dataset &rarr;
              </button>
            </div>
          </div>
        </motion.div>

        {/* Mathematically Crisp Green Vector Outline Overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 883 363" fill="none">
          <path 
            d="M 0.5 0.5 L 802.5 0.5 L 882.5 80.5 L 882.5 362.5 L 80.5 362.5 L 0.5 282.5 Z" 
            stroke="#8BFF9C" 
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Small bright green square dots on the outer card vertices */}
        <div className="absolute inset-0 pointer-events-none z-30">
          <div className="absolute w-[6px] h-[6px] bg-[#8BFF9C] border border-black/35" style={{ top: 0, left: 0, transform: 'translate(-50%, -50%)' }} />
          <div className="absolute w-[6px] h-[6px] bg-[#8BFF9C] border border-black/35" style={{ top: 0, left: 'calc(100% - 80px)', transform: 'translate(-50%, -50%)' }} />
          <div className="absolute w-[6px] h-[6px] bg-[#8BFF9C] border border-black/35" style={{ top: 80, left: '100%', transform: 'translate(-50%, -50%)' }} />
          <div className="absolute w-[6px] h-[6px] bg-[#8BFF9C] border border-black/35" style={{ top: '100%', left: '100%', transform: 'translate(-50%, -50%)' }} />
          <div className="absolute w-[6px] h-[6px] bg-[#8BFF9C] border border-black/35" style={{ top: '100%', left: 80, transform: 'translate(-50%, -50%)' }} />
          <div className="absolute w-[6px] h-[6px] bg-[#8BFF9C] border border-black/35" style={{ top: 'calc(100% - 80px)', left: 0, transform: 'translate(-50%, -50%)' }} />
        </div>
      </div>

      {/* Disclaimer subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-6 text-[18px] text-muted-foreground/45 relative z-10 select-none text-center"
        style={{
          fontFamily: "'Product Sans', sans-serif",
          fontWeight: 400,
          lineHeight: "100%",
          letterSpacing: "0%"
        }}
      >
        Prototype : no files are uploaded. Demo dataset triggers the full flow
      </motion.p>
    </div>
  );
}
