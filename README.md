<div align="center">

# Manufacturing Nathkrupa Frontend

React + Vite + TypeScript application for managing manufacturing workflows: quotations, work orders, vehicles, customers, pricing, payments, and reporting.

</div>

## Overview

This frontend provides a modular dashboard-oriented UI for the Nathkrupa manufacturing domain. It includes authentication, protected routing, a configurable sidebar layout, data entry & listing pages for operational entities (vehicles, quotations, customers, work orders), feature & price management, and basic reporting scaffolds. The design system is powered by shadcn-ui + Tailwind with dark/light theme support.

## Key Features

- Authentication (login & register pages) and `ProtectedRoute` guard
- Responsive application layout (sidebar + top navbar)
- Dashboard with customer & quotation overviews
- Customer management (list, detail)
- Quotation lifecycle (list, generate, detail)
- Work orders (list, create/new, detail)
- Vehicle taxonomy (makers, models, types)
- Feature management (categories, types, images, prices)
- Payments module (placeholder for integration)
- Reporting section scaffold
- Theming (light/dark) with persistence via local storage (`useTheme`)
- Reusable UI primitives (shadcn-ui components in `src/components/ui`)
- API abstraction layer (`src/lib/api.ts`) for backend communication (extensible)

## Tech Stack

| Layer            | Choice            |
|------------------|-------------------|
| Framework        | React 18 + Vite   |
| Language         | TypeScript        |
| UI Components    | shadcn-ui / Radix |
| Styling          | Tailwind CSS      |
| State Utilities  | React hooks       |
| Charts           | (Chart wrapper in `chart.tsx`) |
| Build Tool       | Vite              |
| Linting          | ESLint (config in `eslint.config.js`) |

## Project Structure (excerpt)

```
src/
	components/
		ProtectedRoute.tsx
		layout/ (AppSidebar, Navbar, MainLayout)
		ui/ (reusable design system components)
	hooks/ (theme, toasts, localStorage helpers)
	lib/
		api.ts (API helper)
		utils.ts (generic utilities)
	pages/
		auth/ (Login, Register)
		dashboard/ (Dashboard, Customers, CustomerDetail)
		quotations/ (List, Generate, Details)
		workorders/ (List, Details, DetailsNew)
		vehicles/ (Makers, Models, Types)
		features/ (Categories, Images, Prices, Types)
		payments/ (Payments)
		reports/ (Reports)
		settings/ (Preferences)
	assets/
	index.css / App.css / main.tsx / App.tsx
```

## Getting Started

### Prerequisites

- Node.js 18+ (recommend using nvm)  
- npm 9+

### Installation

```powershell
git clone https://github.com/Tejas2828/manufacturing-nathkrupa-frontend.git
cd manufacturing-nathkrupa-frontend
npm install
npm run dev
```

Visit the local dev server URL shown in the terminal (default: http://localhost:5173).

### Available Scripts

```powershell
npm run dev       # Start Vite dev server
npm run build     # Production build (outputs to dist/)
npm run preview   # Preview production build locally
```

## Environment Variables

Create a `.env` (or `.env.local`) file at the project root as needed. The code currently references a centralized API helper (`src/lib/api.ts`). If you introduce runtime config, a typical variable would be:

```
VITE_API_BASE_URL=https://api.example.com
```

Assumption: If not defined, the API module can default to relative paths. Adjust docs here if backend integration changes.

## Theming

`useTheme` manages light/dark preference using `localStorage`. Tailwind's `dark` class is applied at the root. To add a new semantic color, extend `tailwind.config.ts` and (if needed) mirror it in component variants.

## Routing & Protection

`ProtectedRoute.tsx` wraps authenticated-only pages. Plug in real auth logic (e.g., token check, context) where indicated. Public routes include login/register.

## API Layer

`src/lib/api.ts` centralizes HTTP calls. Extend with typed helper functions (e.g., `getCustomers()`, `createQuotation()`), and unify error handling & interceptors there.

## UI Components

The `src/components/ui` directory contains adapted shadcn-ui primitives. Favor re-exporting or thin wrappers for consistency (e.g. consistent sizing, variants, and dark mode styles) instead of ad-hoc styling scattered across pages.

## Code Quality

- ESLint configuration: `eslint.config.js`
- TypeScript configs: `tsconfig.json`, `tsconfig.app.json`
- Preferred formatting: follow existing style (add Prettier if desired)

## Build & Deployment

Production build:

```powershell
npm run build
```

Outputs to `dist/`. Deploy the static assets to any modern static host (Netlify, Vercel, S3 + CloudFront, etc.). Ensure environment variables (`VITE_*`) are defined at build time.

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Commit with conventional messages (e.g., `feat: add work order filters`)
3. Push & open a Pull Request against `main`
4. Request review

## Roadmap Ideas

- Integrate real authentication (JWT / OAuth)
- API data fetching via React Query / SWR
- Form validation with React Hook Form + Zod
- Role-based authorization
- Export & reporting enhancements (PDF/Excel)
- Unit & integration test suite (Vitest / Testing Library)

## License

Proprietary (default). Add a LICENSE file if you intend to open source.

---

Maintained by the Nathkrupa team. Feel free to propose improvements.
