# 🚀 Social Feed System Setup Guide

## 📋 Overview

Your app now includes a comprehensive **Social Feed System** that transforms video sharing into a modern, social media-style experience similar to Instagram or TikTok.

## ✨ What's New

### 🎯 Features Implemented

✅ **Instagram/TikTok-style Video Feed**  
✅ **Real-time Likes & Comments System**  
✅ **Nested Comment Replies**  
✅ **Infinite Scroll with Pagination**  
✅ **Contact Relationship Management** (Regular vs Trusted)  
✅ **Permission-based Video Visibility**  
✅ **Auto-play Videos in Viewport**  
✅ **Video Player Controls (Play/Pause, Mute, Progress)**  
✅ **Pull-to-Refresh Functionality**  
✅ **Real-time Updates via WebSocket**  
✅ **Mobile-Optimized Responsive Design**  
✅ **Social Sharing Integration**  

### 🗄️ Database Schema Enhancements

- **`video_comments`** - Nested comments with replies
- **`contact_invitations`** - Contact relationship management  
- **`social_feed_cache`** - Performance optimization for feeds
- Enhanced **`video_shares`** with sharing types and visibility levels
- Enhanced **`contacts`** with relationship types (regular/trusted)

## 🛠️ Setup Instructions

### 1. **Apply Database Migration**

You need to apply the new database schema to enable the social feed system:

#### Option A: Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20250123000000-social-feed-system.sql`
4. Click **Run** to apply the migration

#### Option B: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset
# or
supabase db push
```

### 2. **Update Supabase Types (Optional)**

If you're using TypeScript generation, regenerate your types:

```bash
# Generate new TypeScript types
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### 3. **Verify Setup**

1. **Check Navigation**: The bottom navigation now shows "Feed" instead of "Shared"
2. **Test Feed Access**: Navigate to `/social-feed` 
3. **Create Test Content**: 
   - Record a video and make it public
   - Add contacts and share videos with them
   - Test likes and comments functionality

## 🎮 How to Use

### For Users

1. **Access Social Feed**: Tap "Feed" in bottom navigation
2. **View Videos**: Scroll through videos in your personalized feed
3. **Interact with Content**:
   - ❤️ Like/unlike videos
   - 💬 Add comments and replies
   - 📤 Share videos
   - ▶️ Videos auto-play when in view
4. **Pull to Refresh**: Pull down to refresh the feed
5. **Infinite Scroll**: Scroll down to load more videos

### For Content Creators

1. **Share Videos**: When uploading, choose:
   - **Public**: Visible in everyone's feed
   - **Contacts**: Shared with regular contacts
   - **Trusted**: Shared with trusted contacts only
2. **Manage Relationships**: Invite contacts as regular or trusted
3. **Engage**: Respond to comments on your videos

## 🏗️ Technical Architecture

### Permission System

```
User Types:
├── Regular Contacts
│   └── See videos shared immediately with regular contacts
└── Trusted Contacts  
    └── See videos after trusted contact confirmation + regular videos
```

### Feed Algorithm

Videos are ranked by **feed_score**:
- **Own Videos**: 100 points
- **Trusted Releases**: 90 points  
- **Direct Shares**: 80 points
- **Public Videos**: 50 points

### Real-time Updates

The system uses Supabase Realtime for:
- ✅ Live like updates
- ✅ Live comment updates  
- ✅ New video notifications
- ✅ Feed refresh triggers

## 🧩 Component Structure

```
src/
├── hooks/
│   ├── useSocialFeed.ts          # Main feed data management
│   └── useVideoComments.ts       # Comments with nested replies
├── components/social-feed/
│   ├── SocialFeed.tsx            # Main feed component
│   ├── SocialVideoCard.tsx       # Individual video cards
│   └── CommentsSection.tsx       # Comments with replies
└── pages/
    └── SocialFeed.tsx            # Main feed page
```

## 🎨 Customization Options

### Feed Settings

```typescript
// Adjust feed behavior
<SocialFeed 
  autoPlayVideos={true}          // Auto-play when in viewport
  pageSize={10}                  // Videos per page load
  className="custom-styling"     // Custom CSS classes
/>
```

### Video Card Settings

```typescript
// Customize video cards
<SocialVideoCard
  video={videoData}
  onLike={handleLike}
  onShare={handleShare}
  autoPlay={true}                // Auto-play this video
  className="custom-card"        // Custom styling
/>
```

## 🐛 Troubleshooting

### Database Issues

**Problem**: "video_comments table does not exist"
**Solution**: Apply the migration from step 1 above

**Problem**: TypeScript errors about missing types  
**Solution**: Regenerate Supabase types or use `(supabase as any)` temporarily

### Performance Issues

**Problem**: Feed loads slowly
**Solution**: 
- Check `social_feed_cache` table is populated
- Run `refresh_user_social_feed(user_id)` function
- Reduce `pageSize` for initial loads

### Real-time Issues

**Problem**: Likes/comments don't update in real-time
**Solution**:
- Verify Supabase Realtime is enabled for your project
- Check browser console for WebSocket connection errors
- Ensure RLS policies allow real-time subscriptions

## 🔄 Migration from Old System

The new social feed system **replaces** the old SharedWithMe page but maintains backward compatibility:

- ✅ Existing video shares continue to work
- ✅ Old shared videos appear in the new feed
- ✅ Navigation automatically redirects to the new feed
- ✅ All existing permissions are preserved

## 🚦 Next Steps

1. **Apply the database migration** (Step 1 above)
2. **Test the feed** by creating videos and sharing them
3. **Invite contacts** to build your social network
4. **Customize styling** to match your app's design
5. **Monitor performance** and adjust page sizes as needed

## 🎉 You're All Set!

Your app now has a complete social media-style video sharing system! Users can discover, like, comment, and engage with videos in a modern, intuitive interface.

### Key Benefits

- 📱 **Modern UX**: Instagram/TikTok-style interface users expect
- ⚡ **Real-time**: Instant updates for social interactions
- 🔒 **Privacy-Aware**: Respects contact relationships and permissions
- 📈 **Scalable**: Optimized for performance with caching and pagination
- 🎯 **Engaging**: Social features encourage user interaction

---

**Need Help?** Check the troubleshooting section above or review the component documentation in the source files. 