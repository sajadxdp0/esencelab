import { ArrowUpRight } from "lucide-react";
import Badge from "@/components/Badge";
import { StudentResource } from "@/types";

interface SkillGapResourceCardProps {
  resource: StudentResource;
}

export default function SkillGapResourceCard({
  resource,
}: SkillGapResourceCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white/70 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-primary">{resource.title}</h4>
          <p className="text-xs uppercase tracking-[0.12em] text-secondary">
            {resource.provider}
          </p>
        </div>
        <Badge variant="secondary">{resource.level.replace("_", " ")}</Badge>
      </div>
      <p className="text-sm text-secondary">{resource.description}</p>
      <div className="flex flex-wrap gap-2">
        {resource.skills.slice(0, 4).map((skill) => (
          <span
            key={`${resource.id}-${skill}`}
            className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-secondary"
          >
            {skill}
          </span>
        ))}
      </div>
      <p className="text-sm text-secondary">
        <span className="font-semibold text-primary">Why this helps:</span>{" "}
        {resource.whyItHelps}
      </p>
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-sm font-semibold text-accent hover:underline"
      >
        Open resource <ArrowUpRight className="ml-1 h-4 w-4" />
      </a>
    </div>
  );
}
