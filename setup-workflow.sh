#!/bin/bash
# Run this script locally to create the GitHub Actions workflow file.
# The API token used by the bot doesn't have the 'workflows' permission scope,
# so this file must be created manually or via a local git push.

set -e

mkdir -p .github/workflows

cat > .github/workflows/build-apk.yml << 'EOF'
name: Build Android APK

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 45

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Read .env for Supabase config
        id: env
        run: |
          SUPABASE_URL=$(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2)
          SUPABASE_KEY=$(grep EXPO_PUBLIC_SUPABASE_ANON_KEY .env | cut -d'=' -f2)
          echo "SUPABASE_URL=$SUPABASE_URL" >> $GITHUB_ENV
          echo "SUPABASE_KEY=$SUPABASE_KEY" >> $GITHUB_ENV

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Install dependencies
        run: npm install --legacy-peer-deps

      - name: Generate alarm sound
        run: node ./scripts/generate-alarm-sound.js

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          packager: npm

      - name: Prebuild (generate native Android project)
        run: npx expo prebuild --platform android --no-install
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ env.SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ env.SUPABASE_KEY }}

      - name: Build APK
        working-directory: android
        run: ./gradlew assembleRelease --no-daemon -x lint -x lintVitalRelease
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ env.SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ env.SUPABASE_KEY }}

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: mezban-admin-apk
          path: android/app/build/outputs/apk/release/*.apk
          retention-days: 30
EOF

git add .github/workflows/build-apk.yml
git commit -m "Add GitHub Actions workflow for Android APK build"
git push origin main

echo "Workflow file created and pushed! The build will trigger automatically."
