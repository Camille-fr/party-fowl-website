# Party Fowl Website

## Overview
This repository holds both the working Next.js front end (in `partyfowl-next/`) that is being prepared for Payload, and the original static reference build (in `src/`) so the layout, animations, and assets can be compared side by side with the new implementation.

## Structure
- `partyfowl-next/` – the Next.js project where each homepage section will become a React component and where Payload content models will eventually feed dynamic content.
- `src/` – the clean static HTML/CSS/JS build, broken into partials (desktop/mobile split for each section) plus the static assets under `src/assets/img/...`. Use this as the visual reference when adjusting the React/Next version.
- `src/README.md` – additional notes specific to the static build (keep in sync with this top-level README when relevant).
- `.vscode/`, `partyfowl-next/`, and `src/` are the current working directories; keep the generated files (build artifacts, node_modules) out of git.

## Getting started
1. Clone the repo and choose your working area (Next.js, Payload, or static reference).
2. For the Next.js project:
   ```bash
   cd partyfowl-next
   npm install          # or yarn/pnpm if that is your workflow
   npm run dev          # starts the dev server
   ```
3. Use the `src/` static folder to inspect the exact HTML structure, CSS classes, and JS interactions currently deployed on Netlify/partyfowl.vercel.app. Those files can be opened in a browser directly for reference.
4. When content models are ready, keep the Payload definitions in sync with the section names described in the `partyfowl-next` components.

## Workflow notes
- The team is transitioning from the static HTML build to a Tailwind/Next + Payload workflow; keep the animations in sync with the `src/partials` files while “react-izing” them.
- The Netlify preview (`partyfowl-homepage`) and the Vercel deployment (`partyfowl.vercel.app`) serve as live references; update those links in this README only if they change.
- Document any Payload field mappings or automation in follow-up docs inside `partyfowl-next/docs/` or another agreed folder.

## Keeping things clear
- Use section titles that match the static partials so the sellers and AI helpers can cross-reference easily.
- Keep commits focused (e.g., “home hero animation refactor” or “Payload model for menus”) so reviewers understand whether they are looking at static assets or the Next.js translation.
