"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, X } from "lucide-react";

interface ReviewNotesFormProps {
  intent: "APPROVE" | "REJECT";
  busy: boolean;
  onConfirm: (notes: string | null) => void;
  onCancel: () => void;
}

const MAX_NOTES_LENGTH = 2000;

export default function ReviewNotesForm({
  intent,
  busy,
  onConfirm,
  onCancel,
}: ReviewNotesFormProps) {
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const required = intent === "REJECT";

  const handleConfirm = () => {
    const trimmed = notes.trim();
    if (required && !trimmed) {
      setValidationError("Reviewer notes are required for a rejection.");
      return;
    }
    onConfirm(trimmed || null);
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65748a]">
          {required ? "Rejection notes (required)" : "Approval notes (optional)"}
        </span>
        <span className="text-[10px] text-slate-400">
          {notes.length}/{MAX_NOTES_LENGTH}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          if (validationError) setValidationError(null);
        }}
        maxLength={MAX_NOTES_LENGTH}
        rows={3}
        placeholder={
          required
            ? "Explain what must be fixed. This feedback is shared with the athlete."
            : "Optional context, e.g. transcript matches the reported GPA."
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#102341] outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y"
      />
      {validationError && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={
            required
              ? "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
              : "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
          }
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {required ? "Confirm rejection" : "Confirm approval"}
        </button>
      </div>
    </div>
  );
}
