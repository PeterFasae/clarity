# @clarity/web

The Clarity product SPA. Vite + React 18 + TypeScript, shadcn/ui on Tailwind.
`@/` aliases `src/`.

Run it from the repository root:

```bash
npm run dev -w apps/web      # → http://localhost:8080
```

It talks to `services/api`; set `VITE_API_BASE_URL` (see `.env.example`) to
point it somewhere other than the local `serverless offline` default.

`src/components/ui/` is generated shadcn/ui — treat those files as vendored and
add new components with the shadcn CLI. See [ENGINEERING.md](../../ENGINEERING.md) for the
data contract and [BUILD.md](../../BUILD.md) for what is being built when.
