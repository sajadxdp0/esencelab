"use client";

import { Compass, UploadCloud } from "lucide-react";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { BeginnerBlueprint } from "@/components/BeginnerCareerStarter";
import { EntryMode, ResumeSnapshot } from "@/app/(dashboard)/_components/resume/types";
import { Resume } from "@/types";

interface ResumeHeaderProps {
  resume: Resume | null;
  selectedBeginnerTrack: BeginnerBlueprint | null;
  entryMode: EntryMode;
  onEntryModeChange: (mode: EntryMode) => void;
  resumeSnapshot: ResumeSnapshot;
}

export default function ResumeHeader({
  resume,
  selectedBeginnerTrack,
  entryMode,
  onEntryModeChange,
  resumeSnapshot,
}: ResumeHeaderProps) {
  return (
      <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr] xl:items-stretch">
        <Card hoverable={false} className="p-5 sm:p-8 md:p-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                Resume workspace
              </Badge>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
                  {resume
                    ? "Upload your resume and review the extracted profile."
                    : selectedBeginnerTrack
                      ? `Build your first resume for ${selectedBeginnerTrack.name}.`
                      : "Choose your starting point for placement preparation."}
                </h1>
                <p className="mt-3 max-w-2xl text-base text-secondary">
                  {resume
                    ? "This is the source for your career recommendations, role match insights, and recruiter visibility. Use a clean text-based PDF for the best results."
                    : selectedBeginnerTrack
                      ? `Your path is saved as ${selectedBeginnerTrack.name}. Create a one-page starter resume around this track, then upload it here to continue with the normal Esencelab flow.`
                      : "If you already have a resume, upload it normally. If you are just starting out, discover a likely-fit domain first and build your first resume with the right structure."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                  Resume status
                </p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {resume ? "Uploaded" : "Not uploaded"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                  Skills found
                </p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {resumeSnapshot.skills.length}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                  Experience entries
                </p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {resumeSnapshot.experience.length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card hoverable={false} className="p-5 sm:p-8">
          {resume ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-primary">
                Before you upload
              </h2>
              <div className="space-y-3 text-sm text-secondary">
                <p>Use PDF format only.</p>
                <p>Keep the file under 5 MB.</p>
                <p>Prefer selectable text over scanned image PDFs.</p>
                <p>
                  Include skills, education, and project or internship details.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  How would you like to start?
                </h2>
                <p className="mt-2 text-sm text-secondary">
                  Keep the existing upload flow if you already have a resume.
                  Use the beginner path only if you are still figuring out your
                  domain.
                </p>
              </div>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => onEntryModeChange("upload")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    entryMode === "upload"
                      ? "border-primary bg-white shadow-sm"
                      : "border-border bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <UploadCloud className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-primary">
                        I already have a resume
                      </p>
                      <p className="mt-1 text-sm text-secondary">
                        Upload your PDF and continue with the existing Esencelab
                        workflow.
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onEntryModeChange("discover")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    entryMode === "discover"
                      ? "border-primary bg-white shadow-sm"
                      : "border-border bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Compass className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-primary">
                        I am new and need direction
                      </p>
                      <p className="mt-1 text-sm text-secondary">
                        Discover a likely domain, then build a fresher-friendly
                        resume around that path.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </Card>
      </section>
  );
}
