# Apps

This folder contains standalone applications that are not part of the main Next.js app.

## worker/

Pipeline worker for project processing: load projects, transform assets, generate copy, upload to R2.

- Run from `apps/worker/`: `npm run dev` or `npm run pipeline:run`
- Has its own package.json and dependencies
- Not imported by the main Next.js app
