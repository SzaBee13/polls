# AGENT.MD

Quick repo notes for coding agents.

## Project
- Stack: React + TypeScript + Vite + Supabase.
- Main app code: `src/`
- Supabase SQL/functions: `supabase/`

## Code style
- Use **2 spaces** indentation.
- Prefer readable, explicit code over clever one-liners.
- Keep auth and admin checks **fail-closed**.

## Validation
- Run:
  - `npm run lint`
  - `npm run build`

## Admin/security reminders
- Do not hardcode fallback admin emails.
- Handle auth API errors explicitly.
- When a flow spans active+bank projects, include rollback or compensating behavior.
