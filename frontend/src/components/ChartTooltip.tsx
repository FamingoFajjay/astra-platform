import type { ReactNode } from "react";

type ChartTooltipProps = {
  title: string;
  children: ReactNode;
};

export default function ChartTooltip({
  title,
  children,
}: ChartTooltipProps) {
  return (
    <div className="min-w-[110px] border border-[#454545] bg-[#202020] px-2 py-2 font-mono text-[10px] leading-[1.5] text-[#D4D4D4] shadow-none">
      <p className="mb-1 font-semibold text-[#F5F5F5]">
        {title}
      </p>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}
