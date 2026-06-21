"use client";

import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NoteFont = "sans" | "serif" | "mono";

const FONTS: Array<{ id: NoteFont; label: string; familyClass: string }> = [
  { id: "sans", label: "Default", familyClass: "font-sans" },
  { id: "serif", label: "Serif", familyClass: "font-serif" },
  { id: "mono", label: "Mono", familyClass: "font-mono" },
];

interface FontPickerProps {
  value: NoteFont;
  onChange: (next: NoteFont) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          aria-label="Notes font"
          title="Notes font"
        >
          <Type className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {FONTS.map((font) => {
            const active = value === font.id;
            return (
              <button
                key={font.id}
                type="button"
                onClick={() => onChange(font.id)}
                className={`flex flex-col items-center gap-1 rounded-md border px-3 py-2 transition-colors ${
                  active
                    ? "border-foreground/40 bg-accent"
                    : "border-border hover:bg-accent/50"
                }`}
                aria-pressed={active}
              >
                <span
                  className={`text-2xl leading-none font-semibold ${font.familyClass} ${
                    active ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  Ag
                </span>
                <span
                  className={`text-[10px] ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {font.label}
                </span>
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
