import { ReactNode } from "react";
import Card from "@/components/Card";

interface StatCardProps {
  label: string;
  value: ReactNode;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <Card hoverable={false} className="p-5 space-y-2">
      <p className="text-xs uppercase tracking-[0.12em] text-secondary">{label}</p>
      <p className="text-3xl font-semibold text-primary">{value}</p>
    </Card>
  );
}
