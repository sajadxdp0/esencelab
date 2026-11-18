export const scoreToPercent = (score: number): number => {
  if (!Number.isFinite(score)) return 0;
  return Math.max(
    0,
    Math.min(100, score <= 1 ? Math.round(score * 100) : Math.round(score)),
  );
};

export const formatUptime = (uptimeSeconds: number): string => {
  const total = Math.max(0, Math.floor(uptimeSeconds || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const getAlertClassName = (severity?: string): string => {
  if (severity === "critical")
    return "border-[#d8c7c7] bg-[#fbf4f4] text-[#513131]";
  if (severity === "warning")
    return "border-[#ddd4c4] bg-[#fbf8f0] text-[#554831]";
  return "border-border bg-white text-secondary";
};
