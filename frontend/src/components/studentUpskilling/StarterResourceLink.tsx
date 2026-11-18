import { ArrowUpRight } from "lucide-react";
import { StudentResource } from "@/types";

interface StarterResourceLinkProps {
  resource: StudentResource;
}

export default function StarterResourceLink({
  resource,
}: StarterResourceLinkProps) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border border-border bg-white/70 p-4 transition hover:bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-primary">{resource.title}</h4>
          <p className="mt-1 text-sm text-secondary">{resource.provider}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-2 text-sm text-secondary">{resource.whyItHelps}</p>
    </a>
  );
}
