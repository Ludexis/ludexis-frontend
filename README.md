<p align="center">
  <img src="https://raw.githubusercontent.com/Ludexis/Ludexis/main/docs/Ludexis.webp" width="320" alt="Ludexis">
</p>

<h3 align="center">Ludexis Frontend</h3>

<p align="center">
  The web app of <a href="https://github.com/Ludexis/Ludexis">Ludexis</a>, a self-hosted catalogue for game archives.
</p>

<p align="center">
  <a href="https://github.com/Ludexis/ludexis-frontend/actions/workflows/ci.yml"><img src="https://github.com/Ludexis/ludexis-frontend/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Next.js-16-6D3DF5?logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-6D3DF5?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-6D3DF5?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-6D3DF5?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/License-MIT-6D3DF5" alt="MIT License">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Ludexis/Ludexis/main/docs/screenshots/library.webp" alt="Ludexis library" width="100%">
</p>

---

This repository holds the browser side of Ludexis: the library with filters and grouped versions, game pages with screenshots, versions and files, collections, franchises, developers and tags, account settings, and the admin dashboard for libraries, jobs, schedules, users, roles and settings.

It talks to the REST API in [ludexis-backend](https://github.com/Ludexis/ludexis-backend). To run the whole stack, use the Docker Compose setup in the [main repository](https://github.com/Ludexis/Ludexis).

## Getting started

**Requirements:** Node.js 20+ and a running [Ludexis backend](https://github.com/Ludexis/ludexis-backend) (by default on `http://localhost:8000`).

```bash
cp .env.example .env.local
npm ci
npm run dev                          # http://localhost:3000
```

Sign in with the backend's account. A fresh backend creates `admin` / `admin` and asks for a new password straight away.

## Configuration

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Base URL of the backend API |
| `NEXT_PUBLIC_MEDIA_URL` | `http://localhost:8000/media` | Base URL of artwork served by the backend |
| `NEXT_PUBLIC_DEBUG` | `0` | `1` logs every API request in the browser console |

`NEXT_PUBLIC_*` values are inlined at build time: restart the dev server or rebuild the image after changing them. When the API is on another origin, add the web app's origin to the backend's `CORS_ORIGINS`.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit and component tests |
| `npm run test:e2e` | Playwright end-to-end tests against a running app |
| `npx tsc --noEmit` | Type check |

## Project layout

```text
app/              App Router pages: (app) for the signed-in app, (auth) for sign-in and setup
components/
  ui/             shared primitives (buttons, dialogs, menus, inputs)
  game/           game page: hero, details and marks
  library/        library filters and query parameters
  browse/         game grid, collections, franchises, developers, publishers and tags
  admin/          admin dashboard: users, roles, jobs, schedules, duplicates, settings
  shell/          layout, navigation, command palette and job indicator
  media/, brand/, common/
contexts/         authentication state
hooks/            data fetching and route protection
lib/              API clients, types, permissions, media URLs and formatting
e2e/              Playwright tests
```

Tests sit next to the code they cover (`*.test.ts`, `*.test.tsx`) and use Vitest with React Testing Library.

## Docker image

```bash
docker build -t ludexis-frontend .
```

The image is a standalone Next.js server built with relative `/api` and `/media` URLs, so it works behind the bundled proxy on any hostname. Pass `--build-arg NEXT_PUBLIC_API_URL=...` and `--build-arg NEXT_PUBLIC_MEDIA_URL=...` only when the API lives on another origin.

Pushes to `main` publish `ghcr.io/ludexis/ludexis-frontend:latest` for `linux/amd64` and `linux/arm64`. A `v1.2.3` tag also publishes `:1.2.3` and `:1.2`.

## Contributing

Bug reports, ideas and pull requests are welcome. Read the [contributing guide](https://github.com/Ludexis/.github/blob/main/CONTRIBUTING.md) first. In short: branch from `main`, keep each change focused, and make sure `npm run lint`, `npx tsc --noEmit` and `npm test` pass. Include a screenshot for visible changes.

## Maintainer

**Rupankar Majumdar ([@InvictusRex](https://github.com/InvictusRex))**

## License

[MIT](LICENSE)
