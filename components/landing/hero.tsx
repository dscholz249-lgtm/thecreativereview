import Link from "next/link";
import { ArrowRight } from "./icons";

// Hero + mock product preview card. The preview card is illustrative —
// placeholder art with two pins over a striped placeholder, mirroring
// the real asset-detail workspace so marketing implies the product UX.
export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 sm:px-10 sm:pt-24 sm:pb-16">
      <p className="cr-eyebrow mb-5 inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block size-2 rounded-full"
          style={{ background: "var(--cr-accent-green)" }}
        />
        Client review · built for studios
      </p>
      <h1
        className="text-[56px] leading-[0.95] tracking-[-0.035em] sm:text-[88px] lg:text-[104px] lg:leading-[0.92]"
        style={{ fontFamily: "var(--font-display), serif", fontWeight: 800 }}
      >
        Ship the work.
        <br />
        <span style={{ color: "var(--cr-muted)" }}>Skip the</span> email
        <br />
        thread.
      </h1>
      <p
        className="mt-8 max-w-[640px] text-[18px] leading-[1.5] sm:text-[20px]"
        style={{ color: "var(--cr-ink-2)" }}
      >
        Creative Review gives agencies a single link per asset, pin-accurate
        client feedback, clean version history, and approvals that actually
        mean something.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3.5">
        <Link href="/signup" className="cr-btn cr-btn-primary cr-btn-lg">
          Start a free studio <ArrowRight size={16} />
        </Link>
        <Link href="#features" className="cr-btn cr-btn-lg cr-btn-ghost">
          See a sample review →
        </Link>
      </div>

      <div className="mt-16">
        <ProductPreview />
      </div>
    </section>
  );
}

// Pin marker styled to match the in-product pins (see PR 3 asset detail).
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

function ProductPreview() {
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
