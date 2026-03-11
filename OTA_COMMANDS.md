# OTA Server Command Reference 🛠️

This document contains a quick reference for all the important terminal commands we've used to build, test, and deploy the Custom OTA Update Server and the Expo Application.

## 📱 Expo App Commands (Run inside `d:\coil_app`)

### Building the App
To create a fresh Android release build that connects to your OTA server:
```bash
npx expo run:android --variant release
```

### Publishing an Update
To publish a new JavaScript bundle update to the OTA Server:

**Publish to Staging (Default):**
```bash
npm run publish-android-staging
```

**Publish to Production:**
```bash
npm run publish-android
```

**Publish a Mandatory Update (Blocks user until updated):**
```bash
npm run publish-android-staging -- --mandatory
```

**Publish an Update with Release Notes (Shows on Dashboard):**
```bash
npm run publish-android-staging -- -m "Added the new Profile features"
```
*(You can combine both `--mandatory` and `-m` in the same command)*

**Publish to a Custom Channel (For testing hotfixes):**
```bash
npm run publish-android-staging -- --channel bugfix-test-1
```

---

## 🌐 Server Deployment Commands (Run on Cloudways VPS)

These commands are used to push your local server code up to your live server on Cloudways.

### Deploying new code
When you make changes to the server locally, push them to GitHub, then pull them to the server and restart:
```bash
git pull origin main
./build.sh
pm2 restart all
```

*(Note: `./build.sh` runs `npm install`, generates the Prisma client, and runs `npm run build`.)*

### Managing the Server Process (PM2)
```bash
# View server logs in real-time
pm2 logs

# Restart the server
pm2 restart all

# Stop the server
pm2 stop all
```

---

## 🔐 Code Signing Commands (Server Configuration)

If you ever need to regenerate your public/private keys for code signing (WARNING: Doing this will break updates for any old apps built with the previous key):

```bash
# Generate a new keypair (Run this inside your Next.js server folder)
npx expo-updates codesigning:generate --key-dir keys --validity-duration-years 10

# This creates two files:
# 1. private-key.pem -> Copy contents to Cloudways `.env` as OTA_PRIVATE_KEY
# 2. public-key.pem -> Provide this to your native app as certificate.pem
```

---

## 🛠️ Development & Database Commands (Next.js Server)

### Run server locally
```bash
npm run dev
```

### Database Management
To apply schema changes (`schema.prisma`) to your SQLite database:
```bash
# Create the initial database structure or apply new migrations
npx prisma db push

# Open Prisma Studio to view database rows visually in your browser
npx prisma studio
```
