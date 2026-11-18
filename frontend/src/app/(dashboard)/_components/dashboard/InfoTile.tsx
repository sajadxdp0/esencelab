import { ReactNode } from "react";

interface InfoTileProps {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

export default function InfoTile({
  label,
  value,
  valueClassName = "mt-1 text-xl font-semibold text-primary",
}: InfoTileProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-secondary">
        {label}
      </p>
      <p className={valueClassName}>{value}</p>
    </div>
  );
}
