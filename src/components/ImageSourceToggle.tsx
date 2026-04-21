import { cn } from "@/lib/utils";

export type ImageSource = "both" | "own_only";

interface Props {
  value: ImageSource;
  onChange: (v: ImageSource) => void;
  className?: string;
}

const options: { value: ImageSource; label: string }[] = [
  { value: "both", label: "Stock + Mine" },
  { value: "own_only", label: "Mine Only" },
];

export function ImageSourceToggle({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-muted p-1",
        className,
      )}
      role="radiogroup"
      aria-label="Image source"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
