import { ReactNode } from "react";
import Card from "@/components/Card";

interface DashboardStatCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

export default function DashboardStatCard({
  label,
  value,
  detail,
}: DashboardStatCardProps) {
  return (
    <Card hoverable={false} className="p-5 text-center">
      <p className="text-xs uppercase tracking-[0.12em] text-secondary mb-1">
        {label}
      </p>
      <p className="text-3xl font-semibold text-primary">{value}</p>
      {detail ? (
        <p className="text-xs text-secondary mt-1">{detail}</p>
      ) : null}
    </Card>
  );
}
