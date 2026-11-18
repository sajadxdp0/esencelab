"use client";

import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { BeginnerBlueprint } from "@/components/BeginnerCareerStarter";
import { EntryMode, ResumeSnapshot } from "@/app/(dashboard)/_components/resume/types";
import { Resume } from "@/types";

interface ProfileSnapshotPanelProps {
  resume: Resume | null;
  selectedBeginnerTrack: BeginnerBlueprint | null;
  entryMode: EntryMode;
  resumeSnapshot: ResumeSnapshot;
  hasParsedContent: boolean;
  onSelectBeginnerTrack: (track: BeginnerBlueprint | null) => void;
  onEntryModeChange: (mode: EntryMode) => void;
}

export default function ProfileSnapshotPanel({
  resume,
  selectedBeginnerTrack,
  entryMode,
  resumeSnapshot,
  hasParsedContent,
  onSelectBeginnerTrack,
  onEntryModeChange,
}: ProfileSnapshotPanelProps) {
  return (
        <Card hoverable={false} className="p-5 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">
              {resume ? "Current profile snapshot" : "Starter resume guidance"}
            </h2>
            {!resume ? (
              selectedBeginnerTrack ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-white/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                          Saved beginner path
                        </p>
                        <p className="mt-2 text-lg font-semibold text-primary">
                          {selectedBeginnerTrack.name}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-secondary">
                          {selectedBeginnerTrack.fitSummary}
                        </p>
                      </div>
                      <Badge variant="secondary">Path saved</Badge>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                      Skills to include or start learning
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedBeginnerTrack.starterSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-primary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                      First resume checklist
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-secondary">
                      {selectedBeginnerTrack.resumeSections.map((section) => (
                        <li key={section}>{section}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/roadmaps?focus=${selectedBeginnerTrack.id}`}>
                      <Button variant="outline">
                        Open recommended roadmaps
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onSelectBeginnerTrack(null);
                        onEntryModeChange("discover");
                      }}
                    >
                      Change path
                    </Button>
                  </div>
                </div>
              ) : entryMode === "discover" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                      What your first resume should include
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-secondary">
                      <li>
                        One clean page with education, skills, projects, and
                        links.
                      </li>
                      <li>
                        Projects should highlight your contribution, tools, and
                        the result.
                      </li>
                      <li>Only list technologies you can explain clearly.</li>
                      <li>Upload your first version here once it is ready.</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-border bg-white/70 p-4 text-sm leading-6 text-secondary">
                    The normal Esencelab resume-analysis flow will continue
                    exactly as usual after you upload your first draft.
                  </div>
                </div>
              ) : (
                <p className="text-sm text-secondary">
                  No resume uploaded yet. Once you upload one, this page will
                  show your parsed contact details, summary, skills, and
                  extracted experience.
                </p>
              )
            ) : hasParsedContent ? (
              <>
                <div className="rounded-2xl border border-border bg-white/70 p-4">
                  <p className="text-lg font-semibold text-primary">
                    {resumeSnapshot.name || "Unnamed candidate"}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-secondary">
                    {resumeSnapshot.email && <p>{resumeSnapshot.email}</p>}
                    {resumeSnapshot.phone && <p>{resumeSnapshot.phone}</p>}
                    {!resumeSnapshot.email && !resumeSnapshot.phone && (
                      <p>Contact details not found.</p>
                    )}
                  </div>
                </div>

                {resumeSnapshot.summary && (
                  <div className="rounded-2xl border border-border bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                      Professional summary
                    </p>
                    <p className="mt-2 text-sm leading-6 text-secondary">
                      {resumeSnapshot.summary}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                    Skills detected
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resumeSnapshot.skills.length > 0 ? (
                      resumeSnapshot.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-primary"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-secondary">
                        No skills detected yet.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-secondary">
                The resume was uploaded, but the parser could not extract enough
                structured text. Try a cleaner PDF export and upload again.
              </p>
            )}
          </div>
        </Card>
  );
}
