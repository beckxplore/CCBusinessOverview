# Deployment Guide: Dashboard to Free Hosting

This guide will help you deploy your delivery map dashboard online for free using Vercel (frontend) and Render (backend).

## Prerequisites

- A GitHub account (create one at [github.com](https://github.com) if needed)
- Your ClickHouse database credentials
- About 15-20 minutes

## Overview

- **Frontend**: Deployed on Vercel (automatic deployments from GitHub)
- **Backend**: Deployed on Render (free tier)
- **Database**: Your existing ClickHouse database (configured via environment variables)

---

## Step 1: Initialize Git Repository

If you haven't already, initialize a Git repository in your project root:

```bash
cd D:\Beck\AI\2025\SGL
git init
git add .
git commit -m "Initial commit: Delivery Map Dashboard"
```

---

## Step 2: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right, then select **"New repository"**
3. Name your repository (e.g., `delivery-map-dashboard`)
4. **Do NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

---

## Step 3: Push Code to GitHub

GitHub will show you commands. Run these in your project directory:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

---

## Step 4: Deploy Backend to Render

### 4.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up for a free account (you can use GitHub to sign in)
3. Verify your email if prompted

### 4.2 Create New Web Service

1. In the Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub account if prompted
3. Select your repository (`delivery-map-dashboard` or whatever you named it)
4. Configure the service:
   - **Name**: `delivery-map-backend` (or any name you prefer)
   - **Root Directory**: `delivery-map-app/backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Select **"Free"** plan

5. Click **"Advanced"** and add environment variables (see section 4.3 below)

6. Click **"Create Web Service"**

### 4.3 Configure Environment Variables in Render

In the Render dashboard, go to your service → **"Environment"** tab, and add these variables:

**Required ClickHouse Variables:**
```
CLICKHOUSE_HOST=your_clickhouse_host
CLICKHOUSE_PORT_STR=8123
CLICKHOUSE_USER=your_username
CLICKHOUSE_PASSWORD=your_password
CLICKHOUSE_DATABASE=your_database_name
CLICKHOUSE_SECURE_STR=false
CLICKHOUSE_VERIFY_STR=false
```

**Optional Google Sheets Variables** (if you use Google Sheets):
```
GOOGLE_SERVICE_ACCOUNT_JSON=your_json_string
GOOGLE_SHEETS_CACHE_TTL=600
GSHEET_PROCUREMENT_ID=your_sheet_id
GSHEET_PROCUREMENT_WORKSHEET=ProcurementCosts
GSHEET_LOCAL_PRICE_ID=your_sheet_id
GSHEET_LOCAL_PRICE_WORKSHEET=LocalShopPrices
GSHEET_OPERATIONAL_COST_ID=your_sheet_id
GSHEET_OPERATIONAL_COST_WORKSHEET=OperationalCosts
```

**Optional Benchmark API** (if you use it):
```
BENCHMARK_API_URL=your_benchmark_url
BENCHMARK_API_KEY=your_api_key
```

**Important**: Replace all placeholder values with your actual credentials!

### 4.4 Get Your Backend URL

Once deployment starts, Render will provide a URL like:
```
https://delivery-map-backend.onrender.com
```

**Save this URL** - you'll need it in the next step!

**Note**: On the free tier, Render services spin down after 15 minutes of inactivity. The first request after spin-down may take 30-60 seconds to respond.

---

## Step 5: Deploy Frontend to Vercel

### 5.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up for a free account (you can use GitHub to sign in)
3. Import your GitHub account/organization if prompted

### 5.2 Import Project

1. In the Vercel dashboard, click **"Add New..."** → **"Project"**
2. Import your GitHub repository (`delivery-map-dashboard`)
3. Configure the project:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `delivery-map-app`
   - **Build Command**: `npm run build` (should be auto-filled)
   - **Output Directory**: `dist` (should be auto-filled)
   - **Install Command**: `npm install` (should be auto-filled)

### 5.3 Add Environment Variables

Before deploying, click **"Environment Variables"** and add:

```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

Replace `your-backend-url.onrender.com` with your actual Render backend URL (from Step 4.4).

**Important**: Make sure to include `/api` at the end!

### 5.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. Vercel will provide you with a URL like:
   ```
   https://delivery-map-dashboard.vercel.app
   ```

---

## Step 6: Update Backend CORS (If Needed)

If your Vercel URL is different from what you expected, you may need to update the CORS settings:

1. Go to your Render service dashboard
2. Navigate to **"Environment"** tab
3. Add a new environment variable:
   ```
   ALLOWED_ORIGINS=https://your-vercel-url.vercel.app
   ```
   Replace with your actual Vercel URL

4. Render will automatically redeploy with the new settings

---

## Step 7: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://delivery-map-dashboard.vercel.app`)
2. The dashboard should load and connect to your backend
3. Test the functionality to ensure everything works

---

## Troubleshooting

### Backend Not Responding

- **First request is slow**: This is normal on Render's free tier (service spins down after inactivity)
- **Connection errors**: Check that your ClickHouse database is accessible from Render's servers
- **Check logs**: In Render dashboard, go to **"Logs"** tab to see error messages

### Frontend Can't Connect to Backend

- Verify `VITE_API_URL` in Vercel matches your Render backend URL (with `/api` suffix)
- Check browser console for CORS errors
- Ensure `ALLOWED_ORIGINS` in Render includes your Vercel URL

### Build Failures

- **Vercel build fails**: Check that all dependencies are in `package.json`
- **Render build fails**: Check that `requirements.txt` includes all Python dependencies
- Check the build logs in both platforms for specific error messages

### Database Connection Issues

- Ensure your ClickHouse database allows connections from Render's IP addresses
- Verify all ClickHouse environment variables are set correctly in Render
- Check that your database credentials are correct

---

## Updating Your Deployment

### Automatic Updates

Both Vercel and Render automatically redeploy when you push changes to your GitHub repository's `main` branch.

To update:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

### Manual Redeploy

- **Vercel**: Go to your project → **"Deployments"** → Click **"Redeploy"**
- **Render**: Go to your service → Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## Free Tier Limitations

### Vercel
- Unlimited deployments
- 100GB bandwidth per month
- Automatic HTTPS
- Custom domains available

### Render
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- 750 hours of runtime per month (shared across all services)
- Automatic HTTPS

---

## Next Steps

- **Custom Domain**: Add your own domain in Vercel settings
- **Monitoring**: Set up error tracking (e.g., Sentry) for production
- **Analytics**: Add analytics to track usage

---

## Support

If you encounter issues:
1. Check the logs in both Vercel and Render dashboards
2. Verify all environment variables are set correctly
3. Ensure your database is accessible from the internet (if required)

---

**Congratulations!** Your dashboard is now live and accessible to anyone with the URL! 🎉

