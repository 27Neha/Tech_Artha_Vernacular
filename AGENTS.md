# TechArtha Shared Development & Safe-Change Rules

These rules apply permanently across all development sessions in this repository.

## 1. Shared Expo Go Development Server — Port 8081 (Permanent Standard)

- The shared Expo / Metro development server for `apps/mobile` is **permanently standardized on port `8081`**.
- **Never change port `8081`** in scripts, configs, or future sessions.
- **Never start a duplicate Expo / Metro server** when port `8081` is already running (`http://127.0.0.1:8081/status`).
- **Do not stop, restart, or disrupt** the running shared Metro server unnecessarily.
- Both developers' Expo Go devices must connect to the **exact same running Metro server URL** (currently `exp://evafrck-anonymous-8081.exp.direct` on port `8081`, backed by `apps/mobile/.expo/settings.json` `urlRandomness: "EvaFRCk"`) serving this shared project directory so Fast Refresh automatically pushes every code change to both phones.
- Do not change LAN, tunnel, or host settings unless the existing tunnel/host is verified to be broken.
- When updating the backend API tunnel URL (`cloudflared` -> port `3000`), update `LIVE_TUNNEL_API_URL` in `apps/mobile/src/services/api/client.ts` (and `apps/mobile/.env`) so Metro Fast Refresh propagates the new API URL to connected devices without restarting Expo.

## 2. Permanent Safe-Change Rules

Whenever implementing a feature or fixing an issue:

1. Inspect the existing implementation first.
2. Identify the exact files and components that need modification.
3. Make the smallest necessary targeted change; avoid rewriting entire files when a focused edit suffices.
4. Preserve all unrelated screens, components, routes, APIs, navigation, UI elements, and business logic.
5. Never remove existing working functionality just because it is outside the current task.
6. Never overwrite teammate changes or revert to an older Git version.
7. When modifying a shared component, verify every screen that uses it.
8. Obtain explicit user approval before removing any existing feature.

## 3. ArthaVerse & Navigation Invariants

- Keep the bottom tab labeled **`ArthaVerse`** (do not bring back the `Explore` visible label; keep the internal `'Explore'` route name compatible with `MAIN_TAB_ROUTES` and `HomeScreen` deep-links).
- Keep the ArthaVerse hero banner, Market Boulevard / NIFTY 50 `MarketPulseCard`, charts, benchmark info, and official source attributions intact.
- Keep all destination cards (`DESTINATION_CARDS` in `apps/mobile/src/screens/ArthaVerseScreen.tsx`) unconditionally visible and functional; do not reintroduce the old horizontal text tab bar (`subFilterScroll` / `subTabPill` / `filterScroll`).
- Run `npx tsc --noEmit` and `npm test -- --passWithNoTests` in `apps/mobile` after mobile changes, and verify `http://127.0.0.1:8081/status` stays healthy without creating duplicate servers.
