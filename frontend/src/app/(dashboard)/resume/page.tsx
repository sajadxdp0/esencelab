"use client";

/**
 * Student resume page.
 *
 * This page handles resume upload, replacement, parsing results, and the
 * latest stored resume insights for the signed-in student.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Resume } from "@/types";
import BeginnerCareerStarter, {
  BeginnerBlueprint,
} from "@/components/BeginnerCareerStarter";
import Loading from "@/components/Loading";
import { Skeleton } from "@/components/Skeleton";
import {
  deleteResume,
  getReadableErrorMessage,
  getResume,
  uploadResume,
} from "@/lib/dashboardApi";
import { useRoleAccess } from "@/lib/useRoleAccess";
import {
  buildResumeSnapshot,
  isResumeEffectivelyEmpty,
} from "@/app/(dashboard)/_components/resume/format";
import ResumeHeader from "@/app/(dashboard)/_components/resume/ResumeHeader";
import FeedbackBanner from "@/app/(dashboard)/_components/resume/FeedbackBanner";
import UploadPanel from "@/app/(dashboard)/_components/resume/UploadPanel";
import ProfileSnapshotPanel from "@/app/(dashboard)/_components/resume/ProfileSnapshotPanel";
import ResumeDetails from "@/app/(dashboard)/_components/resume/ResumeDetails";
import {
  EntryMode,
  FeedbackState,
} from "@/app/(dashboard)/_components/resume/types";

export default function ResumeUploadPage() {
  const searchParams = useSearchParams();
  const { hasAllowedRole, isCheckingAccess } = useRoleAccess({
    allowedRoles: ["student"],
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resume, setResume] = useState<Resume | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryMode, setEntryMode] = useState<EntryMode>("upload");
  const [selectedBeginnerTrack, setSelectedBeginnerTrack] =
    useState<BeginnerBlueprint | null>(null);

  const fetchResume = useCallback(async () => {
    try {
      const data = await getResume();
      setResume(data);
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        text: getReadableErrorMessage(error, "Failed to load resume data."),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasAllowedRole) return;
    void fetchResume();
  }, [fetchResume, hasAllowedRole]);

  useEffect(() => {
    if (resume) return;
    setEntryMode(
      searchParams.get("mode") === "discover" ? "discover" : "upload",
    );
  }, [resume, searchParams]);

  const validatePdf = useCallback((candidate: File) => {
    const isPdf =
      candidate.type === "application/pdf" ||
      candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "Invalid file type. Please upload a PDF.";
    if (candidate.size > 5 * 1024 * 1024)
      return "File too large. Maximum size is 5MB.";
    return null;
  }, []);

  const setSelectedFile = useCallback(
    (candidate: File | null) => {
      if (!candidate) {
        setFile(null);
        return;
      }
      const validationError = validatePdf(candidate);
      if (validationError) {
        setFeedback({ tone: "error", text: validationError });
        return;
      }
      setFeedback(null);
      setFile(candidate);
    },
    [validatePdf],
  );

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover")
      setDragActive(true);
    if (event.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      setSelectedFile(event.dataTransfer.files?.[0] || null);
    },
    [setSelectedFile],
  );

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setUploadProgress(0);
    setFeedback({ tone: "info", text: "Analyzing your resume..." });

    try {
      const parsedResume = await uploadResume(file, setUploadProgress);
      setResume(parsedResume);
      setFile(null);
      if (isResumeEffectivelyEmpty(parsedResume)) {
        setFeedback({
          tone: "error",
          text: "Resume uploaded, but content appears empty. Please upload a text-based PDF.",
        });
      } else {
        setFeedback({
          tone: "success",
          text: "Your resume has been parsed successfully.",
        });
      }
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        text: getReadableErrorMessage(error, "Failed to upload resume."),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!resume) return;
    if (!confirm("Are you sure you want to delete your resume?")) return;
    try {
      await deleteResume(resume.id);
      setResume(null);
      setFile(null);
      setFeedback({ tone: "success", text: "Resume deleted successfully." });
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        text: getReadableErrorMessage(error, "Failed to delete resume."),
      });
    }
  };

  const resumeSnapshot = useMemo(() => buildResumeSnapshot(resume), [resume]);

  if (isCheckingAccess) {
    return <Loading text="Checking resume workspace..." />;
  }

  if (!hasAllowedRole) return null;

  if (loading) {
    return (
      <div className="layout-container section-spacing space-y-8 max-w-6xl mx-auto">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  const hasParsedContent = resume && !isResumeEffectivelyEmpty(resume);

  return (
    <div className="layout-container section-spacing space-y-8 max-w-6xl mx-auto">
      <ResumeHeader
        resume={resume}
        selectedBeginnerTrack={selectedBeginnerTrack}
        entryMode={entryMode}
        onEntryModeChange={setEntryMode}
        resumeSnapshot={resumeSnapshot}
      />

      <FeedbackBanner feedback={feedback} />

      {!resume && entryMode === "discover" && (
        <BeginnerCareerStarter
          onUseUploadFlow={() => setEntryMode("upload")}
          onSavedTrack={({ message, track }) => {
            setSelectedBeginnerTrack(track);
            setEntryMode("upload");
            setFeedback({ tone: "success", text: message });
          }}
          onError={(text) => setFeedback({ tone: "error", text })}
        />
      )}

      <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <UploadPanel
          file={file}
          resume={resume}
          uploading={uploading}
          uploadProgress={uploadProgress}
          dragActive={dragActive}
          onDrag={handleDrag}
          onDrop={handleDrop}
          onSelectFile={setSelectedFile}
          onClearFile={() => setFile(null)}
          onDelete={() => void handleDelete()}
          onUpload={() => void handleUpload()}
        />

        <ProfileSnapshotPanel
          resume={resume}
          selectedBeginnerTrack={selectedBeginnerTrack}
          entryMode={entryMode}
          resumeSnapshot={resumeSnapshot}
          hasParsedContent={Boolean(hasParsedContent)}
          onSelectBeginnerTrack={setSelectedBeginnerTrack}
          onEntryModeChange={setEntryMode}
        />
      </section>

      {resume && <ResumeDetails resumeSnapshot={resumeSnapshot} />}
    </div>
  );
}
