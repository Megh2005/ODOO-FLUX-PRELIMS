"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";

interface SpellCheckTextareaProps extends React.ComponentProps<typeof Textarea> {
  value: string;
  onValueChange?: (val: string) => void;
}

interface Match {
  offset: number;
  length: number;
  message: string;
  replacements: { value: string }[];
}

export function SpellCheckTextarea({
  value,
  onChange,
  onValueChange,
  className,
  ...props
}: SpellCheckTextareaProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const checkSpelling = useCallback(async (text: string) => {
    if (!text.trim()) {
      setMatches([]);
      return;
    }
    try {
      const res = await fetch("https://api.languagetool.org/v2/check", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          text,
          language: "en-US",
        }),
      });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (e) {
      console.error("Spellcheck error", e);
    }
  }, []);

  // Debounced auto-check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSpelling(value);
    }, 1200); // 1.2s debounce to avoid spamming the free API
    return () => clearTimeout(timer);
  }, [value, checkSpelling]);

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const pos = target.selectionStart;

    // Find if cursor is inside any match
    const match = matches.find((m) => pos >= m.offset && pos <= m.offset + m.length);
    setActiveMatch(match || null);
  };

  const applyCorrection = (match: Match, replacement: string) => {
    const before = value.substring(0, match.offset);
    const after = value.substring(match.offset + match.length);
    const newValue = before + replacement + after;

    if (onValueChange) {
      onValueChange(newValue);
    } else if (onChange) {
      // Create a synthetic event
      const event = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    // Clear matches to force recheck on next debounce
    setMatches([]);
    setActiveMatch(null);
  };

  // Sync scroll
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Render highlights
  const renderHighlights = () => {
    if (!matches.length) return value;

    let lastIdx = 0;
    const parts = [];

    matches.forEach((m, i) => {
      if (m.offset >= lastIdx) {
        parts.push(<span key={`text-${i}`}>{value.substring(lastIdx, m.offset)}</span>);
        parts.push(
          <mark
            key={`match-${i}`}
            className="bg-yellow-300/50 text-transparent rounded-sm pointer-events-auto cursor-help"
            title={m.message}
          >
            {value.substring(m.offset, m.offset + m.length)}
          </mark>
        );
        lastIdx = m.offset + m.length;
      }
    });
    parts.push(<span key={`text-end`}>{value.substring(lastIdx)}</span>);
    return parts;
  };

  return (
    <div className="relative flex flex-col w-full">
      <div className="relative w-full">
        {/* Backdrop for highlights */}
        <div
          ref={backdropRef}
          className={cn(
            "absolute inset-0 pointer-events-none whitespace-pre-wrap break-words px-2.5 py-2 text-base md:text-sm text-transparent overflow-hidden border border-transparent z-0",
            className
          )}
          aria-hidden="true"
        >
          {renderHighlights()}
        </div>

        {/* Actual Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            if (onChange) onChange(e);
            if (onValueChange) onValueChange(e.target.value);
          }}
          onSelect={handleSelect}
          onClick={handleSelect}
          onKeyUp={handleSelect}
          onScroll={handleScroll}
          className={cn("relative z-10 bg-transparent resize-y w-full", className)}
          spellCheck={false}
          {...props}
        />
      </div>

      {/* Suggestions Popover */}
      {activeMatch && activeMatch.replacements && activeMatch.replacements.length > 0 && (
        <div className="mt-2 p-2 bg-white border border-yellow-300 shadow-md rounded-md z-20 flex flex-wrap gap-2 items-center animate-in fade-in zoom-in-95 duration-100">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Suggestions:
          </span>
          {activeMatch.replacements.slice(0, 5).map((r, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyCorrection(activeMatch, r.value)}
              className="text-xs font-semibold bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-1 rounded transition-colors"
            >
              {r.value}
            </button>
          ))}
          <span
            className="text-[10px] text-slate-400 italic ml-auto max-w-[200px] truncate"
            title={activeMatch.message}
          >
            {activeMatch.message}
          </span>
        </div>
      )}
    </div>
  );
}
