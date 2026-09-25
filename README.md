# Hakdar - Sovereign Citizen Welfare & Redressal Network

A modern, premium digital platform designed to bridge the gap between government welfare benefits and citizens who need them. Hakdar provides transparent, voice-assisted access to welfare schemes and grievance redressal with real-time SLA accountability.

## Features

### Core Platform
- **Welfare Scheme Eligibility Checker** - AI-powered rule-based matching against citizen parameters (income, age, occupation, etc.)
- **Multilingual Voice Assistant** - Browser-native speech synthesis and recognition for low-literacy users
- **Anonymous Grievance Reporting** - Encrypted, untraceable complaint submission with real-time tracking
- **Municipal SLA Monitor** - Live public tracking console ensuring officer accountability within strict time limits
- **Interactive Map Visualization** - Leaflet-based geographic drilling for beneficiary and grievance data

### Design & UX
- **Liquid Glassmorphism** - Premium frosted-glass surfaces with high-saturation blur and directional specularity
- **Full-Bleed Cinemagraph Hero** - Edge-to-edge watercolor animated background with mouse-responsive gradient warping
- **Smooth Scroll Experience** - Lenis-powered inertia scrolling with GSAP-driven section reveals
- **Responsive Layouts** - Mobile-first CSS Grid/Flexbox, tested across 320px–1440px+ viewports

## Tech Stack

### Frontend
- **React 18** with React Router (HashRouter for client-side navigation)
- **Three.js + @react-three/fiber** - Custom GLSL shader for animated tricolour gradient background
- **Vite** - Lightning-fast development server with HMR
- **CSS3** - Custom properties, backdrop-filter, -webkit-mask-image for glassmorphism and liquid effects
- **Leaflet** - Interactive map rendering
- **Lucide React** - 400+ consistent SVG icons

### Backend
- **Node.js + Express.js** - RESTful API server
- **SQLite** - Lightweight relational database
- **JWT** - Stateless authentication for officer portal
- **Multer** - File upload handling for evidence media
- **Crypto** - AES-256 encryption for anonymous grievance data

### Build & Tooling
- **Vite** (frontend) - Bundling, HMR, code splitting
- **Oxlint** - Fast, standards-compliant linting
- **Playwright** - Automated browser testing for visual verification

## Project Structure

```
Hakdar/
├── frontend/
│   ├── public/
│   │   ├── Video/                 # Cinemagraph MP4 assets (1280×720)
│   │   ├── images/                # Watercolor illustrations (5:4 aspect)
│   │   └── fonts/                 # Woff2 subsets (Nunito, Bebas Neue)
│   ├── src/
│   │   ├── components/
│   │   │   ├── GrainyGradient.jsx # Three.js GLSL shader + React wrapper
│   │   │   ├── Navbar.jsx         # Sticky translucent navigation
│   │   │   ├── MapWidget.jsx      # Leaflet + marker/popup system
│   │   │   ├── Chatbot.jsx        # Fixed voice assistant UI
│   │   │   └── Footer.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Landing with full-bleed hero
│   │   │   ├── Schemes.jsx        # Eligibility checker interface
│   │   │   ├── FileGrievance.jsx  # Anonymous complaint form + map
│   │   │   ├── TrackGrievance.jsx # SLA timeline + officer details
│   │   │   └── AdminDashboard.jsx # Officer portal (auth-gated)
│   │   ├── styles/
│   │   │   ├── variables.css      # Design tokens (glass tints, blur, shadows)
│   │   │   └── main.css           # Global resets, glass panel system
│   │   └── App.jsx, main.jsx
│   └── package.json
├── backend/
│   ├── server.js
│   ├── database.db
│   └── routes/
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- SQLite3 CLI (optional, for manual schema inspection)

### Frontend

```bash
cd frontend
npm install
npm run dev  # Start Vite dev server on http://localhost:5173
```

Dev server includes:
- Hot Module Replacement (HMR) for instant feedback
- Built-in Vite dev tools (network waterfall, console)
- Automatic browser refresh on file changes

### Backend

```bash
cd backend
npm install
npm run dev  # Starts on http://localhost:5001 (see backend/.env)
```

The server reads `PORT` from `backend/.env` and the frontend reads `VITE_API_URL` from `frontend/.env`;
the two must agree. Both are set to `5001` rather than the code default of `5000` because macOS runs
its AirPlay Receiver on port 5000 — it answers API calls with an empty `403`, which surfaces in the UI
as an empty "no schemes found" state rather than an error.

## Key Components

### GrainyGradient (Shader System)
Custom GLSL fragment shader rendering a **liquid-motion tricolour gradient** (saffron, warm stone, forest green) with:
- **Simplex noise domain-warping** for organic turbulence
- **Mouse-responsive warp** (`uMouse` uniform) so the gradient reacts to cursor position
- **Ripple distortion layers** for 3D depth
- **High-saturation blur** (195% saturate) to keep colors vivid through glass surfaces
- **Scroll-linked opacity** via CSS custom property `--scroll-progress`

### Glass Panel System
All `.glass-panel` elements share unified tokens:
- **Tints** – Two-layer gradient (directional sheen + dark base) for consistent legibility
- **Blur** – `backdrop-filter: blur(30px) saturate(195%) contrast(104%)`
- **Shadows** – Layered (wide pool + tight contact) for floating-pane depth
- **Hover glint** – Slow diagonal sweep across the pane (prefers-reduced-motion safe)

### Navbar
- **Position: sticky** with spring-easing transitions
- **Translucent over hero** – Desaturated blur (42% saturate) so cinemagraph motion reads through
- **Z-index: 100** to float above hero and content
- **Compound selector** (`.navbar.glass-panel`) to avoid CSS specificity cascade bugs

### Map Widget
- **Leaflet instance per page** – Does not rebuild on keystroke (memo + ref stability fixes)
- **Auto-invalidateSize()** on mount and resize to handle flex-column reflow
- **Tile fallback** – CARTO → OpenStreetMap if CDN blocked (with console warning)
- **Custom markers** with color-coded status badges (submitted, escalated, resolved)

## Styling & Theme

### Color Palette
- **Primary Brand** – Saffron `#ff9800` with linear gradients to `#f57c00`
- **Tricolour** – Saffron `#ba6420`, warm stone `#aba08d`, forest green `#124e18`
- **Background** – Dark navy `#080c16` (CSS var `--bg-primary`)
- **Text** – Off-white `#e2e8f0`, secondary `#a1aec9`
- **Accent** – Orange `#ff9800` for interactive states

### Responsive Breakpoints
- **Mobile** – 320px–767px (single column, nav wraps)
- **Tablet** – 768px–1023px (2-column, optimized touch targets)
- **Desktop** – 1024px+ (full 3-column, sticky nav, glass panels)

## Development Workflow

### Running Tests
```bash
cd frontend
npm run lint  # Oxlint code quality
```

### Building for Production
```bash
cd frontend
npm run build  # Vite builds to dist/
npm run preview  # Test production bundle locally
```

### Adding New Pages
1. Create file in `src/pages/MyPage.jsx`
2. Import in `src/App.jsx` and add route to HashRouter
3. Add `.glass-panel` wrapper for consistent styling (non-hero sections)
4. Add `data-reveal` markers for section fade-in on scroll

## Known Constraints

### Hero Section
- **First Hindi line** (`सशक्त किसान, समृद्ध भारत`) sits behind navbar at viewport top
- **Trade-off**: Full-bleed cinemagraph vs. text-on-image legibility
- **Solution**: Place content in lower third of viewport; headline/buttons in separate section below

### Shader Performance
- **GPU-intensive** on low-end devices; consider `@media (prefers-reduced-motion)` fallback
- **Firefox bug**: Some versions require explicit `-webkit-` prefix despite standard support

### Map Tiles
- **CARTO CDN** may be blocked on some networks/extensions (no error, just blank)
- **Fallback**: Automatically switches to OpenStreetMap with console warning

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS 13+, Android 9+ (Chrome)

## Contributing

### Code Style
- **No prettier enforced** — Oxlint provides core linting
- **CSS naming** – BEM-lite: `.component`, `.component-element`, `.component--modifier`
- **Component naming** – PascalCase for React components, kebab-case for CSS classes
- **Comments** – Minimal; only explain *why*, not *what* (code should be self-documenting)

### Before Committing
1. Run `npm run lint` and fix any warnings
2. Test visual changes in browser (Vite HMR)
3. Check responsive behavior at 320px and 1440px widths

## Resources

- **Design System** – See `frontend/src/styles/variables.css` for all design tokens
- **Icon Library** – Lucide React: https://lucide.dev
- **Shader Playground** – GLSL code in `GrainyGradient.jsx` (lines 200–420)
- **Database Schema** – SQLite tables: users, grievances, schemes, officers, sla_logs

## License

Internal project for Hakdar Platform. All rights reserved.

---

**Last Updated:** 2026-08-09  
**Maintained by:** Soumyartho  
**Status:** Active Development
