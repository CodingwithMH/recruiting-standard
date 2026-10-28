# Public Website Design Direction & Page Structure

> **Milestone 1 Deliverable** — Visual direction, page structure, and design system for the public-facing website of The Recruiting Standard.

---

## 1. Design Principles

| Principle | What it means in practice |
|---|---|
| **Institutional trust** | Calm navy palette, generous whitespace, restrained motion, and editorial typography signal a credible school-facing platform — not a hype-driven recruiting app. |
| **Human first** | Real student-athlete imagery and plain, optimistic copy emphasise people over metrics. |
| **Quiet confidence** | No neon gradients, no loud badges, no aggressive CTAs. Confidence comes from clarity and structure. |
| **Clear hierarchy** | One primary action per section, strong eyebrow labels, and consistent card patterns make scanning effortless. |
| **Accessible by default** | Semantic HTML, visible focus states, AA contrast, and reduced-motion support are baseline requirements. |

---

## 2. Brand & Visual Identity

### Colour palette

| Token | Hex | Usage |
|---|---|---|
| **Navy 900 (Primary)** | `#102341` | Headings, primary buttons, brand mark |
| **Navy 700 (Hover)** | `#1d3d68` | Button and link hover states |
| **Navy 800 (Image base)** | `#213d64` | Hero image fallback background |
| **Navy 950 (Overlay)** | `#0b1d39` | Image gradient overlays |
| **Blue 600 (Accent)** | `#2563eb` | Active states, status dots, links |
| **Blue 900 (Accent text)** | `#1e3a8a` | Highlighted heading phrases |
| **Sky 200 (Soft accent)** | `#bed8ff` | CTA band background, icon tint on dark buttons |
| **Surface Light** | `#f4f7fc` | Section backgrounds, hero left panel |
| **Text Muted** | `#65748a` | Body copy, captions, secondary labels |
| **White** | `#ffffff` | Cards, header, primary surfaces |
| **Border** | `slate-200 / 80` | Dividers, card borders, header rule |

> Never introduce new brand colours ad hoc. Extend the table above and update `client/app/globals.css` tokens when a new token is required.

### Typography

- **Typeface:** `Quicksand` (Google Fonts), weights 400–700, loaded in `client/app/globals.css`.
- **Headings:** Semibold (600), tight tracking, tight leading (`leading-[1.08]` on hero).
- **Body:** 400/500, muted navy-grey (`#65748a`), relaxed leading.
- **Eyebrow labels:** 10–12px, uppercase, wide tracking, often paired with a coloured status dot.
- **Numeric labels:** Monospace for step numbers and metadata (`font-mono`).
- **Scale:** Hero `text-4xl → text-6xl`; section headings `text-3xl → text-5xl`; body `text-sm → text-base`; captions `text-[10px] → text-xs`.

### Logo lockup

- `MVP` wordmark with a small blue asterisk accent (`MVP✦`), followed by the two-line lockup:
  - Line 1: **MVP 4.18** (bold, navy)
  - Line 2: **THE RECRUITING STANDARD** (uppercase, tracked, muted)
- Minimum clear space equal to the height of the wordmark; never place on busy imagery without a solid surface.

---

## 3. Layout System

- **Page padding:** `px-[6%]` horizontal rhythm on marketing sections.
- **Header:** sticky, 80–96px tall, white with a `slate-200/80` bottom rule.
- **Grid:** 12-column mental model; most sections use 2–4 column card grids collapsing to a single column on mobile.
- **Section rhythm:** `py-16` → `py-20` on desktop; full-bleed bands alternate white and `#f4f7fc`.
- **Cards:** `rounded-2xl`, `border border-slate-200/80`, light surface at rest; on hover → white surface, blue-300 border, subtle shadow.
- **Buttons:** Full pill (`rounded-full`), navy fill with white text; secondary actions are text links with an arrow icon.
- **Imagery:** Full-bleed, warmly lit athletics photography with navy gradient overlays and small mono captions.
- **Breakpoints:** Tailwind defaults (`sm` 640, `lg` 1024) with mobile-first composition.

### Component conventions

| Component | Convention |
|---|---|
| Primary CTA | `rounded-full bg-[#102341] text-white`, arrow-up-right icon |
| Secondary CTA | Text link, arrow-right icon, no fill |
| Card | Rounded 2xl, 1px slate border, hover lift |
| Eyebrow | Uppercase micro-label, optional pulsing blue dot |
| Section heading | Navy heading + muted second clause in a span |
| FAQ | Native `<details>`/`<summary>` for accessibility |
| Navigation | Sticky header, active underline, mobile drawer |

---

## 4. Motion & Interaction

- Motion is subtle and functional: 150–300ms colour, transform, and shadow transitions.
- Hero spotlight card uses a gentle `-rotate-2 → rotate-0` hover.
- No auto-playing carousels or parallax on the public site.
- All motion must respect `prefers-reduced-motion`.
- Focus states are always visible; never remove outlines without a replacement.

---

## 5. Public Page Structure

| Route | Purpose | Key sections |
|---|---|---|
| `/` | Brand promise and top-level conversion | Hero, intro, feature grid, role ecosystem, recruiting workflow, pathway, verified profiles, security, sport strip, mission, FAQ, CTA |
| `/about` | Mission and credibility | Story, values, comparison to traditional recruiting |
| `/features` | How the platform works | Verification workflow, coach tools, athlete journey, school workflow |
| `/pricing` | Transparent school plans | Annual $1,500 / monthly $250 cards, procurement steps, FAQ |
| `/school-registration` | Institutional intake | Registration form, 3-step verification timeline, expectations |
| `/contact` | Support and inquiries | Inquiry form, response expectations |
| `/login` | Portal entry | Role-based login entry point |
| `/privacy-policy` | Privacy commitments | Student privacy, FERPA/COPPA safeguards |
| `/terms` | Legal terms | Platform terms of use |

**SEO endpoints**

- `/sitemap.xml` — generated by `client/app/sitemap.ts` for all 9 public routes.
- `/robots.txt` — generated by `client/app/robots.ts`; disallows `/portal/`, `/admin/`, and `/api/`.

---

## 6. Accessibility Requirements

- Target **WCAG 2.1 AA** contrast for text and interactive controls.
- Every image with meaning has descriptive `alt` text; decorative imagery uses `aria-hidden`.
- Interactive elements are real `<a>`/`<button>` elements with keyboard focus support.
- Form fields have persistent labels, inline validation messages, and `aria-describedby` wiring.
- Navigation exposes `aria-current="page"` and an accessible mobile toggle with `aria-expanded`.
- Test with keyboard-only navigation and at 200% browser zoom.

---

## 7. Content & Tone

- Copy is calm, direct, and human: short sentences, no jargon, no exaggerated claims.
- Speak to two audiences — school programs and student-athlete families — without mixing their calls to action.
- Numbers and process steps are shown plainly (e.g. “1, 2, 3”) to reinforce trust.
- Never promise outcomes (scholarships, offers); describe access, clarity, and verified information instead.

---

## 8. Relationship to the Portal

The public site is marketing + intake only. All authenticated portal surfaces (`/portal/*`, `/admin/*`) are private, unindexed, visually consistent with this direction, but optimised for data density and operational workflows rather than editorial storytelling.
