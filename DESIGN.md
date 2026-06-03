# Mercy Design System

The source of truth for consistent styling across the Mercy marketing site (and any future surfaces that share its aesthetic). The vibe: ultra-dark, minimal, terminal-inspired, engineering-centric. Think observability/infra products — not SaaS marketing pastels.

This doc describes **what the brand looks like**, **which tokens to reach for**, and **how to compose them**. Anything not in here that affects visual output probably belongs here — add it.

---

## 1. Scope

There are **two distinct visual systems** in `apps/web`:

| System | Where it lives | Token source |
| --- | --- | --- |
| **Landing / marketing** | Everything under `.landing-theme` (currently `/`) | `--color-brand-*` + `--font-*-brand` in `globals.css` |
| **App shell** | `/dashboard`, `/login`, `/register` | shadcn OKLch tokens (`--primary`, `--background`, …) in `globals.css` |

They **do not share colors**. The landing is dark-only, orange-accented, monospace-leaning. The app shell uses grayscale OKLch from shadcn. Keep them separate — do not leak landing tokens into the app, and do not use shadcn tokens on the landing.

If you're adding a new marketing surface, wrap it in `.landing-theme` and use the `brand-*` utilities. If you're adding a new app surface, use the shadcn tokens.

The rest of this document focuses on the **landing/marketing system**.

---

## 2. Design principles

1. **Quiet, not loud.** Heavy color belongs on the one thing you want the user to click. Everything else is a variant of near-black.
2. **Monospace says "developer tool."** Use mono for headlines, prefixes, labels, and any UI that evokes a terminal. Sans-serif for long-form body copy.
3. **Contrast is information.** Use the foreground ramp (`fg-strong` → `fg` → `fg-muted` → `fg-subtle`) to signal hierarchy. Don't use color to rank content.
4. **Negative space is part of the design.** Left-align. Leave the right side empty (or fill it with decoration). Don't fill a grid just because it's there.
5. **Motion is subtle and optional.** Animations are decorative, slow (≥20s loops), low-opacity, and must respect `prefers-reduced-motion`.
6. **Depth comes from borders, not shadows.** Hairline `border-brand-border` on surfaces. Reserve glow shadows for hover on the primary CTA.
7. **Accessibility is not negotiable.** Every interactive element has a visible focus ring. All text clears WCAG AA.

---

## 3. Color tokens

All landing colors are registered in `apps/web/app/globals.css` inside `@theme inline { … }`. Tailwind v4 compiles them into utilities: `bg-brand-*`, `text-brand-*`, `border-brand-*`, `ring-brand-*`, `outline-brand-*`.

### Palette

| Token | Hex | Role |
| --- | --- | --- |
| `brand-bg` | `#050505` | Deepest background |
| `brand-bg-elev` | `#0A0A0A` | Thin strips (announcement bar), slightly-elevated chrome |
| `brand-surface` | `#111111` | Card / panel / modal surface |
| `brand-surface-2` | `#161616` | Nested surface, hover of a `surface` |
| `brand-border` | `#222222` | Default hairline border |
| `brand-highlight` | `#2A2A2A` | Hover border, subtle UI highlight |
| `brand-fg` | `#EAEAEA` | Default body text |
| `brand-fg-strong` | `#FFFFFF` | Headlines, emphasized text |
| `brand-fg-muted` | `#A1A1A1` | Secondary text, nav links, metadata |
| `brand-fg-subtle` | `#B3B3B3` | Subheads, long-form body |
| `brand-accent` | `#FF6A2A` | **The single accent.** CTAs, focus rings, keyword highlights |
| `brand-accent-hover` | `#FF7A3A` | Brighter orange on hover |

### Usage rules

- **Background on the landing root**: never a flat color. Use `.landing-theme` (applies a radial + linear dark gradient). Don't set `bg-brand-bg` on `<body>`.
- **Don't invent new oranges or grays.** If you need "slightly lighter," use the next ramp token. Introduce a new token (and add it here) if a real step is missing.
- **Don't use OKLch tokens (`--primary`, `--foreground`, etc.) inside `.landing-theme`.** They're the app shell's palette.
- **Accent is precious.** Exactly one CTA per viewport should be orange. A page with three orange buttons has no hierarchy.

### Contrast quick reference

| Pair | Ratio | WCAG |
| --- | --- | --- |
| `fg-strong` (#FFF) on `brand-bg` | 20.4:1 | AAA |
| `fg` (#EAEAEA) on `brand-bg` | 18.3:1 | AAA |
| `fg-subtle` (#B3B3B3) on `brand-bg` | 9.2:1 | AAA |
| `fg-muted` (#A1A1A1) on `brand-bg` | 7.3:1 | AA normal / AAA large |
| `accent` (#FF6A2A) on `brand-bg` | 5.1:1 | AA normal |
| `#000` on `accent` (button text) | 9.4:1 | AAA |

Any text smaller than 18px must hit AA. When in doubt, use `fg-subtle` instead of `fg-muted` for body copy.

---

## 4. Typography

Two stacks, registered in `@theme`:

```css
--font-mono-brand: ui-monospace, "SF Mono", Menlo, Consolas, "Cascadia Mono", monospace;
--font-sans-brand: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
```

Utilities: `font-mono-brand`, `font-sans-brand`. Sans is the default on `.landing-theme`.

### When to use which

- **Mono** — headlines, wordmark, terminal prefixes (`~/`, `$`, `>`), code snippets, nav labels when you want a "CLI nav" feel, tags/keywords like `#LAUNCHED`, numeric data.
- **Sans** — body paragraphs longer than ~10 words, form labels, tooltips, dense UI where mono's wider glyphs would hurt readability.

### Type scale

Tailwind size utilities. Keep these in mind rather than hardcoding:

| Use case | Classes |
| --- | --- |
| H1 (hero) | `font-mono-brand text-4xl sm:text-5xl md:text-6xl leading-[1.1] tracking-tight` |
| H2 (section) | `font-mono-brand text-3xl md:text-4xl leading-tight tracking-tight` |
| H3 | `font-mono-brand text-xl md:text-2xl` |
| Eyebrow / prefix | `font-mono-brand text-sm text-brand-fg-muted` (often prefixed `~/`) |
| Body lead | `text-base md:text-lg text-brand-fg-subtle` |
| Body | `text-sm md:text-base text-brand-fg-subtle` |
| Caption / meta | `text-xs text-brand-fg-muted` |

### Rules

- **One `<h1>` per page.** Everything else is `<h2>`/`<h3>`.
- **Never style a non-heading to look like a heading** (screen reader outline must match the visual outline).
- **Tracking**: tight (`tracking-tight`) on headings, default on body. Loose (`tracking-wide`) only for all-caps eyebrows — avoid.
- **Line-height**: `1.1` for headlines, Tailwind defaults elsewhere.
- **Don't mix font weights within a word.** Bold is fine; italics are discouraged (clashes with mono aesthetic).
- **Terminal prefixes**: use the accent color for the prefix only, e.g. `<span className="text-brand-accent">~/</span>mercy`.

---

## 5. Layout & spacing

- **Max container width**: `max-w-7xl` (1280px). Everything top-level uses this; don't go wider.
- **Horizontal padding**: `px-6` on mobile, no change on desktop (the container handles centering). For thin strips like the announcement bar, `px-4`.
- **Vertical section rhythm**: hero `py-24 md:py-32`; feature sections `py-20 md:py-28`; tight sections `py-12 md:py-16`.
- **Left-align, always.** Never center body copy inside a hero — it looks like a SaaS template. Center-aligning is reserved for narrow confirmations or 404s.
- **Right side**: either empty (deliberate negative space) or decorative (arrow pattern, illustration). No "hero screenshot" slot — the product is implied, not demoed.
- **Grid**: 12-column `grid md:grid-cols-12 gap-10`. Text typically takes 7 columns, decoration takes 5.
- **Breakpoints**: Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536). `md` is the "desktop" boundary for this design — below `md`, everything stacks.

---

## 6. Borders, radii, shadows

- **Border width**: `1px` (`border`). Never thicker on the landing.
- **Border color**: `border-brand-border` by default. `border-brand-highlight` on hover or active states. Translucent `border-brand-border/60` on sticky/blurred chrome so the page shows through.
- **Radii**:
  - Buttons: `rounded-[8px]` (fits the spec's 6–10px range).
  - Cards / panels: `rounded-lg` (Tailwind default, maps to the app's `--radius` scale — fine here too).
  - Pills / chips: `rounded-full`.
  - Don't use `rounded-2xl+` on the landing. Too soft for the brand.
- **Shadows**: avoid flat drop-shadows. The one exception is the orange **CTA hover glow**:
  ```
  hover:shadow-[0_0_24px_-4px_rgba(255,106,42,0.6)]
  ```
  Do not add glows to non-accent elements. Do not stack shadows.

---

## 7. Components

### Buttons

There are two landing buttons, rendered by `components/landing/cta-button.tsx`. Always use this component for navigating CTAs — don't hand-roll another orange button.

| Variant | When to use |
| --- | --- |
| `brand` | The **primary** CTA of the viewport (e.g. "Book a demo"). One per viewport. Orange fill, black text. |
| `brandOutline` | Secondary CTAs ("Sign up for free →"). Outlined, fills on hover. |

Rules:
- Both render `<Link>`, because CTAs navigate. Use `<button>` only for actions that don't change the URL (dismiss, open menu, toggle).
- Size: height `h-11`, padding `px-5`. Don't shrink without reason.
- Primary button text is `text-black` (not `text-brand-bg`) — maximum contrast on the orange fill.

The shadcn `Button` (`components/ui/button.tsx`) is for the **app shell**. Don't import it into landing components.

### Links

- Inline link in body copy: `text-brand-fg-strong underline underline-offset-4 decoration-brand-border hover:decoration-brand-accent transition-colors`.
- Nav link: `text-sm text-brand-fg-muted hover:text-brand-fg-strong transition-colors`.
- **Don't** color plain links orange. Orange is reserved for CTAs and focus rings.

### Surfaces

- **Card**: `bg-brand-surface border border-brand-border rounded-lg`.
- **Elevated card** (hover, modal): `bg-brand-surface-2 border border-brand-highlight`.
- **Thin strip** (announcement bar, footer band): `bg-brand-bg-elev border-b border-brand-border`.

### Navbar

`sticky top-0 z-40 backdrop-blur-md bg-brand-bg/70 border-b border-brand-border/60`. The blur + 70% opacity over the page is the signature. Don't use a solid background.

### Announcement bar

Thin (`h-8`), `bg-brand-bg-elev`, monospace, highlighted keyword in `text-brand-accent font-semibold`, right-aligned dismiss that persists in `sessionStorage`. Only one announcement at a time.

### Decorative pattern (arrow drift)

The `>>>` drift (`components/landing/arrow-pattern.tsx`) is the one piece of large-scale motion. Rules:
- Opacity 5–10% (`text-brand-accent/10`).
- Duration ≥20s linear infinite.
- Edges masked with a `linear-gradient` CSS mask so the pattern fades to transparent at left/right.
- Always `aria-hidden="true"`, `pointer-events-none`.
- Must stop when `prefers-reduced-motion: reduce`.

---

## 8. Motion

- **Durations**: `200–300ms` for UI transitions (hover, focus, toggle). `≥20s` for ambient background motion.
- **Easing**: `ease-out` for UI interactions. `linear` for looping ambient motion.
- **What animates**: color, background, border-color, box-shadow, opacity, subtle `translate-y-px` on `active:`.
- **What doesn't animate**: layout (width/height/position). No bounces. No springs.
- **Keyframes**: define in `globals.css` under the `landing-*` namespace (`landing-drift`, future: `landing-fade-up`). Keep them scoped by name so they don't collide with the app shell.
- **Reduced motion**: wrap every keyframed animation in a `prefers-reduced-motion` media query that disables it. Hover color transitions can stay — they're not motion.

---

## 9. Accessibility

- **Landmarks**: `<header>` (chrome), `<nav aria-label="Primary">`, `<main id="main">`, `<section>`, `<footer>`. Exactly one `<main>` per page.
- **Skip link**: first focusable element on every page, jumps to `#main`. Visually hidden until focused.
- **Focus rings**: every interactive element gets
  ```
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent
  ```
  Don't remove outlines without a replacement. Orange-on-dark passes contrast.
- **Semantics**:
  - CTAs that navigate → `<Link>`.
  - Toggles, dismiss, menu open/close → `<button type="button">`.
  - Decorative SVG, background patterns → `aria-hidden="true"`.
- **ARIA**:
  - Hamburger: `aria-expanded`, `aria-controls`, and an `aria-label` that reflects state (`"Open menu"` / `"Close menu"`).
  - Mobile drawer: `role="dialog" aria-modal="true" aria-label="Menu"`.
  - Announcement strip: `role="region" aria-label="Announcement"`.
- **Keyboard**: Escape closes any open overlay. Focus moves into the overlay on open and returns to the trigger on close. Body scroll locks while a modal drawer is open.
- **Color is never the only signal**: pair it with an icon, weight, or position.
- **Text size**: never below `text-xs` (12px). Body copy `text-sm` or larger.

---

## 10. Responsive behavior

- **Below `md` (768px)**: everything stacks. Navbar collapses to a hamburger. Hero decorative column is `hidden md:block`.
- **Touch targets**: mobile buttons and icon-buttons are at least 40×40 (`h-10 w-10`). The announcement dismiss uses `h-6 w-6` — acceptable because it's not a primary action, but anything in the nav is 40+.
- **Text scales**: headlines bump down one step at `sm`, two steps below `sm`. Body text stays constant.
- **No horizontal scroll.** Truncate long strings (`truncate`), wrap where possible, and set container `overflow-hidden` on sections with decorative overflow.

---

## 11. Content voice (brief)

Even though this doc is about visuals, copy and layout are inseparable. A quick reminder:

- Headlines are short. 2–4 words per line, max 3 lines.
- Use present tense and active voice. "Ship services" beats "You can ship services."
- The product is a tool, not a personality. Don't use first-person ("We built…"). Use imperative ("Deploy in seconds").
- Jargon is fine when accurate. Don't dumb it down for a non-developer audience — this isn't the target.

---

## 12. How to extend this system

When you need something new, in order of preference:

1. **Compose from existing tokens.** 95% of new surfaces need nothing new.
2. **Add a token**, not a one-off hex. If you use `bg-[#333]` twice, promote it to `--color-brand-*` in `@theme` and document it here.
3. **Add a component** to `components/landing/` when a pattern repeats in more than one place. Keep components presentational; data and state live in the consuming page.
4. **Update this file** in the same PR as the change. A design system that drifts from its docs is worse than no docs.

### Anti-patterns (don't do this)

- Using arbitrary values (`bg-[#0e0e0e]`) when a token exists.
- Importing shadcn components into landing pages to "save time."
- Adding a fourth ramp step ("I just need one more gray") without reviewing whether the ramp actually needs a new step.
- Centering marketing body copy.
- Using the accent orange on anything other than a CTA, focus ring, or tightly-scoped keyword highlight.
- Loading a new web font without a measurable reason. System stacks are the default.
- Adding motion that moves layout (width/height/position).
- Silently dropping a focus ring to make a design "cleaner."

---

## 13. App shell layout patterns

These rules apply to every page under `/dashboard` (and any future authenticated route). They are separate from the landing system — use shadcn tokens only, no `brand-*` utilities.

### Page wrapper

Every dashboard page root uses `p-6`. Constrained-width pages (forms, detail views) add `max-w-* mx-auto`. Full-bleed tables omit the max-width so they use the full available column width.

```tsx
// Full-width page (tables, lists)
<div className="p-6">…</div>

// Constrained page (forms, settings, narrow detail)
<div className="p-6 max-w-2xl mx-auto">…</div>
<div className="p-6 max-w-lg mx-auto">…</div>
```

**Max-width reference by page type:**

| Page type | Max-width |
|---|---|
| Settings, narrow forms | `max-w-2xl` |
| New-resource forms | `max-w-lg` |
| Detail / run history | `max-w-4xl` |
| List pages (Mercio, Mercob) | `max-w-5xl` |
| Projects table | none (full-width) |

### Page header

Every page opens with a header block that has `mb-6`. When a primary action belongs on the page, it sits right-aligned in the same row.

```tsx
// Title only
<div className="mb-6">
  <h1 className="text-xl font-semibold">Page title</h1>
</div>

// Title + subtitle
<div className="mb-6">
  <h1 className="text-xl font-semibold">Page title</h1>
  <p className="text-sm text-muted-foreground mt-0.5">One-line description</p>
</div>

// Title + subtitle + action
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-xl font-semibold">Page title</h1>
    <p className="text-sm text-muted-foreground mt-0.5">One-line description</p>
  </div>
  <Button size="sm">Action</Button>
</div>
```

### List / table containers

All lists and tables share the same border treatment. Use `divide-y` for card-style lists, `overflow-hidden` + `<table>` for tabular data.

```tsx
// Card list
<div className="border border-border rounded-lg divide-y divide-border">
  <div className="p-4 flex items-center gap-4">…</div>
</div>

// Table
<div className="border border-border rounded-lg overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-border bg-muted/30">
        <th className="text-left px-4 py-3 text-muted-foreground font-medium">…</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer">
        <td className="px-4 py-3">…</td>
      </tr>
    </tbody>
  </table>
</div>
```

Rules:
- Border radius is always `rounded-lg`. Never `rounded-xl` inside the app shell.
- List item padding: `p-4` for card rows, `px-4 py-3` for table cells.
- Row hover: `hover:bg-muted/30 transition-colors`.
- Dividers: `divide-border` (lists) or `border-b border-border/60` (table rows except last).

### Empty states

Consistent height and alignment across all pages — never use viewport-height (`h-[70vh]`) or dashed borders.

```tsx
<div className="border border-border rounded-lg p-12 text-center">
  {/* optional icon, 8×8, text-muted-foreground/40 */}
  <p className="text-sm text-muted-foreground">Nothing here yet.</p>
  <Button size="sm" className="mt-4">Primary action</Button>
</div>
```

### Stat / metadata tiles

Used on detail pages to surface key numbers at a glance.

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
  <div className="bg-muted/40 border border-border rounded-lg p-3">
    <p className="text-xs text-muted-foreground mb-1">Label</p>
    <p className="text-sm font-medium">Value</p>
  </div>
</div>
```

### Back navigation

Detail pages that drill into a list item use a ghost icon button as the back link, aligned with the page title in the same flex row.

```tsx
<div className="flex items-start gap-4 mb-6">
  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground mt-0.5 p-1 h-auto" onClick={() => router.push('/dashboard/…')}>
    <ArrowLeft className="w-4 h-4" />
  </Button>
  <div className="flex-1 min-w-0">
    <h1 className="text-xl font-semibold">Item name</h1>
    …
  </div>
</div>
```

### Forms

```tsx
<form className="space-y-5">
  <div className="space-y-1.5">
    <Label htmlFor="field-id">Label</Label>
    <Input id="field-id" … />
  </div>

  {/* grouped / advanced section */}
  <div className="space-y-4 border border-border rounded-lg p-4">…</div>

  {/* error */}
  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
    {error}
  </p>

  {/* actions */}
  <div className="flex gap-2 pt-1">
    <Button type="submit">Submit</Button>
    <Button type="button" variant="ghost">Cancel</Button>
  </div>
</form>
```

---

## 14. File map

| File | What lives there |
| --- | --- |
| `apps/web/app/globals.css` | All tokens (`@theme inline`), `.landing-theme` scope, keyframes, `prefers-reduced-motion` guards |
| `apps/web/app/layout.tsx` | Metadata, root `<body>` classes |
| `apps/web/app/page.tsx` | Landing composition |
| `apps/web/components/landing/` | All landing components. Colocated so they move as one unit if promoted to a `(marketing)` route group |
| `apps/web/components/ui/` | shadcn primitives for the **app shell**. Not for the landing |
| `apps/web/lib/utils.ts` | `cn()` — use for every className composition |
| `DESIGN.md` | This file |
