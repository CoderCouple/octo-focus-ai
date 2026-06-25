"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EditableTitle } from "@/components/editable-title";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateMeetingClientApi } from "../api/meetings-client-api";
import type { Meeting } from "../types";
import { MeetingRecorder } from "./meeting-recorder";

const AUTOSAVE_MS = 800;

export function MeetingDetail({ meeting }: { meeting: Meeting }) {
  const router = useRouter();
  const [title, setTitle] = useState(meeting.title);
  const [transcript, setTranscript] = useState(meeting.transcript);
  const [summary, setSummary] = useState(meeting.summary);
  const [hasAudio, setHasAudio] = useState(meeting.hasAudio);
  const transcriptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transcriptTimer.current) clearTimeout(transcriptTimer.current);
      if (summaryTimer.current) clearTimeout(summaryTimer.current);
    };
  }, []);

  const handleRename = async (next: string) => {
    setTitle(next);
    try {
      await updateMeetingClientApi(meeting.id, { title: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const handleTranscriptChange = (value: string) => {
    setTranscript(value);
    if (transcriptTimer.current) clearTimeout(transcriptTimer.current);
    transcriptTimer.current = setTimeout(() => {
      void updateMeetingClientApi(meeting.id, { transcript: value }).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Save failed");
      });
    }, AUTOSAVE_MS);
  };

  const handleSummaryChange = (value: string) => {
    setSummary(value);
    if (summaryTimer.current) clearTimeout(summaryTimer.current);
    summaryTimer.current = setTimeout(() => {
      void updateMeetingClientApi(meeting.id, { summary: value }).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Save failed");
      });
    }, AUTOSAVE_MS);
  };

  const handleUploaded = () => {
    setHasAudio(true);
    // Refresh server data so the list page picks up the new metadata.
    router.refresh();
  };

  return (
    <section className="flex h-full flex-col gap-6 p-6 lg:p-8">
      <header>
        <EditableTitle
          value={title}
          onSave={handleRename}
          size="lg"
          placeholder="Untitled meeting"
        />
      </header>

      <MeetingRecorder
        meetingId={meeting.id}
        hasInitialAudio={hasAudio}
        initialDurationSec={meeting.audioDurationSec}
        onUploaded={handleUploaded}
      />

      <div className="grid gap-2">
        <Label htmlFor="transcript">Transcript</Label>
        <Textarea
          id="transcript"
          value={transcript}
          onChange={(e) => handleTranscriptChange(e.target.value)}
          placeholder="Paste or type the transcript here. Autosaves."
          className="min-h-[200px]"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => handleSummaryChange(e.target.value)}
          placeholder="Key points, decisions, action items. Autosaves."
          className="min-h-[140px]"
        />
      </div>
    </section>
  );
}
