import React from "react";
import { Check, AlertCircle, X } from "lucide-react";
import { useMusic } from "../context/MusicContext";

export default function Toast() {
  const { toast } = useMusic();

  if (!toast.show) return null;

  return (
    <div
      className="position-fixed top-0 start-50 translate-middle-x mt-4"
      style={{ zIndex: 9999, pointerEvents: 'none' }}
    >
      <div 
        className={`d-flex align-items-center gap-3 px-4 py-2 rounded-pill shadow-lg border border-white border-opacity-25 animate-fade-in-up ${
          toast.type === "success" ? "bg-success" : "bg-danger"
        } text-white`}
        style={{ minWidth: '200px', pointerEvents: 'auto' }}
      >
        {toast.type === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
        <span className="fw-bold small">{toast.message}</span>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
