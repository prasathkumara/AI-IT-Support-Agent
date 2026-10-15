// Avatar — initials on a soft gradient, used for the signed-in employee.
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-semibold text-white",
        className ?? "h-9 w-9 text-sm",
      )}
    >
      {initials(name)}
    </span>
  );
}
