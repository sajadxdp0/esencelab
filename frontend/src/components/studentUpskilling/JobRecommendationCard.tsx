import Link from "next/link";
import { BookmarkPlus, Loader2 } from "lucide-react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { oneLine, scoreToPercent } from "@/components/studentUpskilling/format";
import { JobMatch } from "@/types";

interface JobRecommendationCardProps {
  entry: JobMatch;
  savingJobId: string | null;
  onSave: (jobId: string) => void;
}

export default function JobRecommendationCard({
  entry,
  savingJobId,
  onSave,
}: JobRecommendationCardProps) {
  const match = scoreToPercent(entry.matchScore);
  const requiredSkills =
    entry.requiredSkills && entry.requiredSkills.length > 0
      ? entry.requiredSkills
      : Array.isArray(entry.job.skills)
        ? entry.job.skills
        : [];

  return (
    <div className="p-6 rounded-3xl border-[0.5px] border-border bg-white/50 hover:bg-white transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col group">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif font-bold text-primary line-clamp-1 mb-1 group-hover:text-accent transition-colors">
            {entry.job.title}
          </h3>
          <p className="text-sm text-secondary uppercase tracking-widest font-semibold">
            {entry.job.company}
          </p>
        </div>
        <Badge variant={match > 75 ? "success" : match > 50 ? "warning" : "secondary"}>
          {match}% Match
        </Badge>
      </div>

      <p className="text-sm font-light text-secondary mb-4 line-clamp-3 leading-relaxed">
        {oneLine(entry.job.description, 160)}
      </p>

      {requiredSkills.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-secondary">Required</p>
          <div className="flex flex-wrap gap-2">
            {requiredSkills.slice(0, 4).map((skill) => (
              <span
                key={`${entry.job.id}-required-${skill}`}
                className="rounded-full border border-border bg-white/80 px-2.5 py-1 text-[11px] text-secondary"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {entry.missingSkills?.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-secondary">Missing</p>
          <div className="flex flex-wrap gap-2">
            {entry.missingSkills.slice(0, 3).map((skill) => (
              <span
                key={`${entry.job.id}-missing-${skill}`}
                className="rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-[11px] text-gray-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto grid gap-2">
        <Link href={`/jobs/${entry.job.id}`}>
          <Button variant="outline" size="sm" className="w-full rounded-xl">
            View Job
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full rounded-xl"
          disabled={savingJobId === entry.job.id}
          onClick={() => onSave(entry.job.id)}
        >
          {savingJobId === entry.job.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <BookmarkPlus className="mr-2 h-4 w-4" /> Save for later
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
