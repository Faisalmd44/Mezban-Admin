# Mezban-Admin

Admin app for Mezbaan Restro — order management, menu control, and business analytics.

## Features

- **Dashboard** — Real-time stats (revenue, orders, customers) with pending order alerts
- **Orders** — Accept/reject incoming orders, advance status through the pipeline
- **Menu Management** — Toggle item availability (in stock / out of stock)
- **Notifications** — FCM push notifications with looping alarm sound for new orders
- **Analytics** — Revenue metrics, order status breakdown, completion rate
- **Settings** — Notification preferences, alarm reminders, WhatsApp support, logout

## Setup

```bash
npm install --legacy-peer-deps
npx expo start
```

## Build APK via GitHub Actions

The workflow file is at `github-actions-workflow.yml` in the repo root. To activate it:

1. Move it to `.github/workflows/build-apk.yml`:
   ```bash
   mkdir -p .github/workflows
   mv github-actions-workflow.yml .github/workflows/build-apk.yml
   git add .github/workflows/build-apk.yml
   git commit -m "Move workflow to .github/workflows"
   git push
   ```
2. Add repository secrets (Settings > Secrets and variables > Actions):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. The build will trigger automatically on push to main, or manually via Actions tab.

The APK will be available as a downloadable artifact in the Actions run.
