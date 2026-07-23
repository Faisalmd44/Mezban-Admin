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

The GitHub Actions workflow file couldn't be created directly via the API (the bot token lacks the `workflows` permission scope). To activate the build:

### Option 1: Run the setup script (easiest)
```bash
git clone https://github.com/Faisalmd44/Mezban-Admin.git
cd Mezban-Admin
chmod +x setup-workflow.sh
./setup-workflow.sh
```
This creates `.github/workflows/build-apk.yml`, commits it, and pushes. The build triggers automatically.

### Option 2: Manual
1. Clone the repo and create the file:
```bash
mkdir -p .github/workflows
# Copy the workflow content from setup-workflow.sh into:
# .github/workflows/build-apk.yml
git add .github/workflows/build-apk.yml
git commit -m "Add GitHub Actions workflow"
git push
```

### After the workflow is active:
- Pushes to `main` trigger the build automatically
- Or go to **Actions** tab > **Build Android APK** > **Run workflow** to trigger manually
- The APK will be available as a downloadable artifact in the Actions run page
- No secrets needed — the workflow reads Supabase config from the `.env` file
