// Mock product preview card — browser chrome + placeholder canvas with
// two pins over a striped placeholder, mirroring the real asset-detail
// workspace so marketing implies the product UX. Extracted from the
// live-marketing hero so the waitlist hero can reuse it.

export function ProductPreview() {
  return (
    <div className="cr-card-raised overflow-hidden">
      {/* Browser chrome */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--cr-line)" }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ background: "var(--cr-destructive-ink)" }}
          />
          <span
            className="size-2.5 rounded-full"
            style={{ background: "var(--cr-paper-2)" }}
          />
          <span
            className="size-2.5 rounded-full"
            style={{ background: "var(--cr-paper-2)" }}
          />
        </div>
        <span
          className="cr-mono flex-1 text-center"
          style={{ color: "var(--cr-muted)" }}
        >
          review.creative/acme/spring-menu/v2
        </span>
        <span className="w-8" />
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px]">
        {/* Canvas */}
        <div
          className="relative flex items-center justify-center"
          style={{
            aspectRatio: "4 / 3",
            backgroundColor: "var(--cr-paper-2)",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0 12px, rgba(10, 10, 10, 0.04) 12px 13px)",
            border: "1px dashed var(--cr-line-strong)",
            borderRadius: "var(--cr-radius)",
          }}
        >
          <span
            className="cr-mono"
            style={{ color: "var(--cr-muted)", fontSize: 12 }}
          >
            [ Instagram ad A — product shot ]
          </span>
          <PreviewPin n={1} x="32%" y="30%" />
          <PreviewPin n={2} x="64%" y="58%" />
        </div>

        {/* Comments panel */}
        <div className="flex flex-col gap-3">
          <p className="cr-eyebrow">Pins · 2</p>
          <PreviewPinCard n={1} who="Dana R.">
            Pull the product tag up into this corner.
          </PreviewPinCard>
          <PreviewPinCard n={2} who="Dana R.">
            Seal is competing with the headline.
          </PreviewPinCard>
          <div className="mt-2 flex flex-col gap-[18px]">
            <button className="cr-btn cr-btn-constructive w-full" disabled>
              <CheckGlyph /> Approve
            </button>
            <button className="cr-btn cr-btn-destructive w-full" disabled>
              <CrossGlyph /> Request changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPin({ n, x, y }: { n: number; x: string; y: string }) {
  return (
    <div
      aria-hidden
      className="absolute flex size-7 items-center justify-center rounded-full text-white"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        background: "var(--cr-ink)",
        border: "2px solid white",
        boxShadow: "0 2px 0 var(--cr-ink), 0 0 0 1px var(--cr-ink)",
        fontFamily: "var(--font-display), serif",
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {n}
    </div>
  );
}

function PreviewPinCard({
  n,
  who,
  children,
}: {
  n: number;
  who: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cr-card p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="cr-badge"
          style={{
            background: "var(--cr-ink)",
            color: "white",
            borderColor: "var(--cr-ink)",
          }}
        >
          <PinGlyph /> {n}
        </span>
        <span
          className="text-[12px] font-bold uppercase tracking-[0.06em]"
          style={{ color: "var(--cr-ink)" }}
        >
          {who}
        </span>
      </div>
      <p className="text-[14px]" style={{ color: "var(--cr-ink-2)" }}>
        {children}
      </p>
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5 7 12l6-8" />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg width={11} height={11} viewBox="0 0 14 14" fill="currentColor">
      <path d="M8.5 1.2 12.8 5.5 11.1 7.2l-.7-.7-3 3 .2 2.6-1.5 1.5-2.4-2.4L1 13.6l.3-2.7 2.4-2.4L1.3 6.1l1.5-1.5 2.6.2 3-3-.7-.7z" />
    </svg>
  );
}
