"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type DraftPin = {
  localId: string;
  x_pct: number;
  y_pct: number;
  comment_text: string;
};

type AnnotatorProps = {
  versionId: string;
  imageUrl: string;
  imageAlt: string;
  // Called on every state change so the parent can serialize `pins` into a
  // hidden input before form submission.
  onChange: (pins: DraftPin[]) => void;
};

// Click-to-pin annotator for image review (PRD 7.8.2 + 7.9).
//
// - Coordinates are percentages (0..1) — RLS-independent rendering.
// - Display numbers are creation order; re-computed every render from the
//   pins array, never stored.
// - Drafts persist to localStorage keyed by version id so a reload doesn't
//   lose in-progress work. Persisted server-side only on submit.
// - A pin is only "active" (inline editor open) when selected.
export function Annotator({
  versionId,
  imageUrl,
  imageAlt,
  onChange,
}: AnnotatorProps) {
  const storageKey = `annotator:draft:${versionId}`;
  const [pins, setPins] = useState<DraftPin[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hydrated = useRef(false);

  // Hydrate from localStorage once after mount. We intentionally call setState
  // inside the effect — this is the canonical "sync local state with a
  // browser-only API" pattern. useSyncExternalStore is a worse fit because
  // we also need to WRITE, and it can't cleanly represent a point-in-time
  // snapshot of mutable state.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftPin[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setPins(parsed);
      }
    } catch {
      // ignore — localStorage unavailable or bad data
    }
  }, [storageKey]);

  // Persist + bubble up on any change.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(pins));
    } catch {
      // ignore — private mode or quota exceeded; drafts still live in state
    }
    onChange(pins);
  }, [pins, storageKey, onChange]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      const id = crypto.randomUUID();
      const pin: DraftPin = {
        localId: id,
        x_pct: Math.round(x * 10_000) / 10_000,
        y_pct: Math.round(y * 10_000) / 10_000,
        comment_text: "",
      };
      setPins((prev) => [...prev, pin]);
      setActiveId(id);
    },
    [],
  );

  const updatePinText = useCallback((localId: string, comment_text: string) => {
    setPins((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, comment_text } : p)),
    );
  }, []);

  const deletePin = useCallback((localId: string) => {
    setPins((prev) => prev.filter((p) => p.localId !== localId));
    setActiveId((prev) => (prev === localId ? null : prev));
  }, []);

  const indexedPins = useMemo(
    () => pins.map((p, i) => ({ ...p, number: i + 1 })),
    [pins],
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="relative isolate overflow-hidden rounded-lg bg-neutral-100">
        <div className="relative aspect-[4/3] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt={imageAlt}
            onClick={handleImageClick}
            className="absolute inset-0 h-full w-full cursor-crosshair object-contain"
            draggable={false}
          />
          {indexedPins.map((p) => {
            const isHoverOrActive = activeId === p.localId || hoverId === p.localId;
            return (
              <button
                key={p.localId}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveId(p.localId);
                }}
                onMouseEnter={() => setHoverId(p.localId)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  left: `${p.x_pct * 100}%`,
                  top: `${p.y_pct * 100}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow ${isHoverOrActive ? "bg-amber-600" : "bg-blue-700"}`}
                aria-label={`Pin ${p.number}`}
              >
                {p.number}
              </button>
            );
          })}
        </div>
        <p className="border-t bg-white px-3 py-2 text-xs text-neutral-500">
          Click anywhere on the image to drop a pin.
        </p>
      </div>

      <aside className="flex flex-col gap-3">
        <header className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Comments ({indexedPins.length})
        </header>
        {indexedPins.length === 0 ? (
          <p className="text-sm text-neutral-600">
            Click anywhere on the image to drop your first pin.
          </p>
        ) : null}
        {indexedPins.map((p) => {
          const isActive = activeId === p.localId;
          const isHover = hoverId === p.localId;
          return (
            <div
              key={p.localId}
              onMouseEnter={() => setHoverId(p.localId)}
              onMouseLeave={() => setHoverId(null)}
              className={`rounded-md border p-3 transition-colors ${isActive ? "border-amber-600 bg-amber-50" : isHover ? "border-neutral-400" : "border-neutral-200 bg-white"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isActive ? "bg-amber-600 text-white" : "bg-blue-700 text-white"}`}
                >
                  {p.number}
                </span>
                <div className="flex gap-1">
                  {!isActive && p.comment_text.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setActiveId(p.localId)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => deletePin(p.localId)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {isActive || p.comment_text.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    autoFocus
                    placeholder="What needs to change here?"
                    value={p.comment_text}
                    onChange={(e) => updatePinText(p.localId, e.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveId(null)}
                      disabled={p.comment_text.trim().length === 0}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-neutral-800">
                  {p.comment_text}
                </p>
              )}
            </div>
          );
        })}
      </aside>
    </div>
  );
}

export function clearAnnotatorDraft(versionId: string) {
  try {
    localStorage.removeItem(`annotator:draft:${versionId}`);
  } catch {
    // ignore
  }
}
