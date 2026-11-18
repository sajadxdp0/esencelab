import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Card from "@/components/Card";
import { NextStepCard } from "@/components/studentUpskilling/types";

interface NextStepCardViewProps {
  card: NextStepCard;
}

export default function NextStepCardView({ card }: NextStepCardViewProps) {
  return (
    <Card hoverable={false} className="p-5 space-y-3">
      <p className="text-xs uppercase tracking-[0.12em] text-secondary">
        {card.eyebrow}
      </p>
      <h3 className="text-lg font-semibold text-primary">{card.title}</h3>
      <p className="text-sm text-secondary">{card.detail}</p>
      {card.href ? (
        card.external ? (
          <a
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-semibold text-accent hover:underline"
          >
            {card.cta} <ArrowUpRight className="ml-1 h-4 w-4" />
          </a>
        ) : (
          <Link
            href={card.href}
            className="inline-flex items-center text-sm font-semibold text-accent hover:underline"
          >
            {card.cta} <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        )
      ) : (
        <span className="inline-flex items-center text-sm font-semibold text-accent">
          {card.cta}
        </span>
      )}
    </Card>
  );
}
