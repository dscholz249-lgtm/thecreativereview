# Creative Review — Logo 04B (Filmstrip-check)

Two drop-in renders of the chosen mark: a **full lockup** (ticket + "The Creative Review" wordmark) and a standalone **app-icon glyph** for tabs / favicons / avatars.

Ticket height is mathematically locked to the wordmark stack (eyebrow + "Creative" + "Review"), so the ticket cap aligns with the wordmark cap line and the ticket base with the wordmark baseline. No visual daylight between the mark and type.

## Files

- `CreativeReviewLogo.jsx` — React component. Props: `variant` (`'light' | 'dark'`), `fontSize` (number, default 72), `withEyebrow` (bool, default true).
- `logo-glyph.svg` — standalone ticket glyph, paper variant (light backgrounds).
- `logo-glyph-dark.svg` — standalone ticket glyph, ink variant (dark backgrounds).
- `logo-lockup.svg` — full lockup, paper variant, sized for exports.
- `logo-lockup-dark.svg` — full lockup, ink variant.

## Tokens used

Pull these from the existing design system (`styles.css` in the main redesign), not from new constants:

| Token | Value | Where used |
|---|---|---|
| `--ink` | `#0A0A0A` | Ticket frame stroke (light), wordmark fill |
| `--paper` | `#F5F3EE` | Ticket fill (light mode) |
| `--card` | `#FFFFFF` | — |
| `--accent-green` | `#34D17E` | Center check panel |
| `--font-display` | Roboto Slab 700–800 | Wordmark |
| `--muted` | `#5C5C58` | "The" eyebrow |
| radius | `8px` | Ticket outer + inner check panel |

## Sizing contract

```
stackHeight = fontSize * 0.3  /* eyebrow */
            + 4               /* eyebrow gap */
            + fontSize * 0.95 * 2  /* two lines of wordmark */

ticketHeight = stackHeight
ticketWidth  = ticketHeight * 0.78
gap(ticket, wordmark) = fontSize * 0.3
```

Any `fontSize` works. Common sizes:
- `16` — top-bar lockup
- `32` — email signature, site footer
- `72` — hero / marketing
- glyph-only 32×32 — favicon / app icon

## Usage in the product

```jsx
// Top bar — light surface
<CreativeReviewLogo fontSize={16} />

// Marketing hero — light surface
<CreativeReviewLogo fontSize={80} />

// Dark surface (e.g. reviewer modal on ink)
<CreativeReviewLogo fontSize={16} variant="dark" />

// App icon / favicon — glyph only
<CreativeReviewGlyph size={32} />
```

## Don'ts

- Don't stretch the ticket to fit different wordmark sizes — always size via `fontSize` so the ratio holds.
- Don't tint the green panel — it's the brand's one secondary color; keep it `--accent-green`.
- Don't add sprocket dots back in.
- Don't drop the eyebrow ("The") below 16px font size — it becomes illegible. Pass `withEyebrow={false}` for small lockups if needed.
