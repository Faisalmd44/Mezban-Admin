# Mezbaan Admin

Admin app for Mezbaan Restro — order management, menu control, and business analytics.

## Features

- **Dashboard** — Real-time stats (revenue, orders, customers) with pending order alerts
- **Orders** — Accept/reject incoming orders, advance status through the pipeline (Received → Preparing → Packed → Out for Delivery → Delivered)
- **Menu Management** — Toggle item availability (in stock / out of stock)
- **Notifications** — FCM push notifications with looping alarm sound for new orders, plus background polling fallback (every 12s)
- **Analytics** — Revenue metrics, order status breakdown, completion rate, recent activity
- **Settings** — Notification preferences, alarm reminders (30s & 60s), WhatsApp support, logout

## Tech Stack

- Expo Router (file-based navigation)
- React Native + TypeScript
- Supabase (auth + backend API)
- Firebase Cloud Messaging (push notifications)
- Notifee (local notifications with alarm sound)
- Razorpay (payment integration)

## Setup

```bash
npm install --legacy-peer-deps
npx expo start
```

## Environment

The `.env` file contains Supabase credentials (pre-configured for the Mezbaan project).

## Build

```bash
npx expo prebuild
npx expo run:android
```
