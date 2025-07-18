# Daily Prompt Notifications Setup

## 🎯 Current Status

Your daily prompt notification system is **already implemented** in your codebase! The missing piece is automatic scheduling to trigger notifications when new cycling prompts are available.

## 📋 What's Already Working

✅ **Notification System**: Users receive notifications in the app  
✅ **Click-to-Record**: Notifications navigate users to record page with prompts  
✅ **XP Integration**: Bonus XP awarded for daily prompt completion  
✅ **Real-time Updates**: Instant notification delivery via WebSocket  
✅ **Cycling Prompts**: Prompts change every 5 minutes automatically  

## 🚀 Setup Options

### Option 1: GitHub Actions (Recommended)

**Pros**: Free, reliable, integrated with your repo  
**Cons**: Requires GitHub secrets setup

1. **Add GitHub Secrets** (Repository Settings → Secrets and variables → Actions):
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. **The workflow file is ready**: `.github/workflows/daily-prompts.yml`

3. **Test manually**:
   - Go to Actions tab in GitHub
   - Select "Daily Prompt Notifications" workflow
   - Click "Run workflow"

### Option 2: External Cron Service

Use services like [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), or [Render Cron](https://render.com):

**URL to call every 5 minutes**:
```
POST https://your-project.supabase.co/functions/v1/schedule-daily-prompts
```

**Headers**:
```
Content-Type: application/json
Authorization: Bearer your-anon-key
```

### Option 3: Vercel Cron Jobs

If you deploy to Vercel, add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/trigger-prompts",
    "schedule": "*/5 * * * *"
  }]
}
```

Create `/api/trigger-prompts.js`:
```javascript
export default async function handler(req, res) {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/schedule-daily-prompts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  res.json(data);
}
```

### Option 4: Supabase Edge Functions + External Webhook

**Manual trigger URL** (for testing):
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://your-project.supabase.co/functions/v1/schedule-daily-prompts
```

## 🧪 Testing

### 1. Manual Test
```bash
# Test the scheduler function
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://your-project.supabase.co/functions/v1/schedule-daily-prompts

# Check if notifications were created
# Login to your app and check notifications panel
```

### 2. Check Function Logs
```bash
supabase functions logs schedule-daily-prompts --follow
```

### 3. Verify Notifications in Database
```sql
-- Check recent notifications
SELECT * FROM notifications 
WHERE type = 'daily_prompt' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 📊 Monitoring

### Success Indicators:
- ✅ Users receive notifications every 5 minutes when prompts change
- ✅ Notifications appear in app notification center  
- ✅ Clicking notifications navigates to record page with prompt
- ✅ Bonus XP awarded when users complete daily prompts

### Troubleshooting:
- **No notifications**: Check cron service is calling the endpoint
- **Function errors**: Check Supabase function logs
- **Users not receiving**: Verify they completed onboarding (`onboarding_completed = true`)

## 🎮 How It Works

1. **Cycling Prompts**: Change every 5 minutes via `get_current_cycling_prompt()`
2. **Scheduler Trigger**: External cron calls `/schedule-daily-prompts` every 5 minutes  
3. **Notification Creation**: Function calls `/generate-daily-prompts` to create notifications
4. **User Delivery**: Real-time WebSocket delivers notifications instantly
5. **XP Rewards**: Users get +15 XP for completing daily prompts

## 🚀 Quick Start

**Fastest setup** (5 minutes):

1. Get your Supabase URL and anon key from dashboard
2. Sign up at [cron-job.org](https://cron-job.org) (free)
3. Create a cron job:
   - **URL**: `https://your-project.supabase.co/functions/v1/schedule-daily-prompts`
   - **Method**: POST
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Headers**: `Authorization: Bearer your-anon-key`
4. Enable the job and test!

Your users will immediately start receiving daily prompt notifications! 🎉 