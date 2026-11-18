import { ReactNode } from 'react';

interface BlueprintPanelProps {
  title: string;
  children: ReactNode;
}

export default function BlueprintPanel({ title, children }: BlueprintPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">{title}</p>
      {children}
    </div>
  );
}
