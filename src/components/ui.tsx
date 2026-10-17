import type { ButtonHTMLAttributes, ReactNode, SVGProps } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Icons (Lucide paths, matching the Figma icon set) ---------- */
function Svg({ children, size = 20, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}
type IconProps = { size?: number; className?: string };
export const Icon = {
  Upload: (p: IconProps) => <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></Svg>,
  FileText: (p: IconProps) => <Svg {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></Svg>,
  Check: (p: IconProps) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>,
  Calendar: (p: IconProps) => <Svg {...p}><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></Svg>,
  Spinner: (p: IconProps) => <Svg {...p} className={cx("animate-spin", p.className)}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></Svg>,
  Alert: (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></Svg>,
  Copy: (p: IconProps) => <Svg {...p}><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></Svg>,
  ArrowLeft: (p: IconProps) => <Svg {...p}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></Svg>,
  Sparkle: (p: IconProps) => <Svg {...p}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></Svg>,
  Clock: (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Svg>,
};

/* ---------- Logo ---------- */
export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center gap-[2px] rounded-lg bg-brand" aria-hidden="true">
        {[6, 12, 16, 10, 5].map((h, i) => (
          <span key={i} className="w-[2.5px] rounded-full bg-on-brand" style={{ height: h }} />
        ))}
      </div>
      <span className="font-display font-medium tracking-[-0.02em] text-2xl leading-7">Recap</span>
    </div>
  );
}

/* ---------- Button ---------- */
type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary: "bg-surface text-fg border border-line-strong hover:bg-subtle",
  ghost: "text-fg hover:bg-subtle",
  danger: "bg-record text-white hover:opacity-90",
};
export function Button({ variant = "primary", icon, className, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <button
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-[var(--color-text-disabled)]",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------- Status badge ---------- */
type Status = "Uploading" | "Transcribing" | "Summarising" | "Done" | "Failed";
const badge: Record<Status, string> = {
  Uploading: "bg-warning-subtle text-warning-fg",
  Transcribing: "bg-info-subtle text-info-fg",
  Summarising: "bg-brand-subtle text-brand-fg",
  Done: "bg-subtle text-fg-2",
  Failed: "bg-record-subtle text-record-fg",
};
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium", badge[status])}>
      {status === "Done" ? <Icon.Check size={12} /> : status === "Failed" ? <Icon.Alert size={12} /> :
        status === "Summarising" ? <Icon.Sparkle size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
}

/* ---------- Avatar ---------- */
const tones = ["bg-brand-subtle text-brand-fg", "bg-info-subtle text-info-fg", "bg-warning-subtle text-warning-fg", "bg-record-subtle text-record-fg"];
export function initials(name: string): string {
  const m = /^Speaker ([A-Z0-9]+)$/.exec(name);
  if (m) return m[1];
  return name.trim().slice(0, 2).toUpperCase();
}
export function Avatar({ name, tone, size = "md" }: { name: string; tone: number; size?: "sm" | "md" }) {
  return (
    <span className={cx(
      "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
      size === "sm" ? "h-[22px] w-[22px] font-mono text-[11px]" : "h-[30px] w-[30px] text-xs",
      tones[tone % tones.length],
    )}>
      {initials(name)}
    </span>
  );
}

/* ---------- Card & banner ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-line-subtle bg-surface p-5", className)}>{children}</div>;
}
export function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[11px] font-medium uppercase tracking-[0.6px] text-fg-3", className)}>{children}</p>;
}
export function Banner({ type, title, children, action }: { type: "info" | "error"; title: string; children?: ReactNode; action?: ReactNode }) {
  const tone = type === "error" ? "bg-record-subtle text-record-fg" : "bg-info-subtle text-info-fg";
  return (
    <div role={type === "error" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl p-3", tone)}>
      {type === "error" ? <Icon.Alert className="mt-0.5 shrink-0" /> : <Icon.Clock className="mt-0.5 shrink-0" />}
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {children && <div className="text-[13px] leading-[18px] text-fg-2">{children}</div>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
