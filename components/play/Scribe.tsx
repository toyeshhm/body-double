/** A paper textarea with a live "12/140" counter. Same UI every round so answers look alike. */
export function Scribe({
  id,
  label,
  value,
  onChange,
  max,
  rows = 3,
  hideLabel = false,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  max: number;
  rows?: number;
  hideLabel?: boolean;
  placeholder?: string;
}) {
  const full = value.length >= max;
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "font-display text-[1.3rem] font-semibold leading-snug text-ink"}
        style={hideLabel ? undefined : { fontVariationSettings: '"SOFT" 100' }}
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value.slice(0, max));
        }}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        aria-describedby={`${id}-count`}
        className="field resize-none leading-snug"
      />
      <span
        id={`${id}-count`}
        aria-live={full ? "polite" : "off"}
        className={`self-end text-sm font-semibold tabular-nums ${full ? "text-rasp-deep" : "text-ink-soft"}`}
      >
        {value.length}/{max}
      </span>
    </div>
  );
}
