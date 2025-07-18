#!/bin/bash

# Deploy Edge Functions for Contact System
# This script ensures all required Edge Functions are deployed

echo "🚀 Deploying Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    exit 1
fi

echo "📋 Checking Edge Function status..."

# Deploy check-contact-status function
echo "🔍 Deploying check-contact-status function..."
supabase functions deploy check-contact-status --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ check-contact-status deployed successfully"
else
    echo "❌ Failed to deploy check-contact-status"
    exit 1
fi

# Deploy send-welcome-email function if it exists
if [ -d "supabase/functions/send-welcome-email" ]; then
    echo "📧 Deploying send-welcome-email function..."
    supabase functions deploy send-welcome-email --no-verify-jwt
    
    if [ $? -eq 0 ]; then
        echo "✅ send-welcome-email deployed successfully"
    else
        echo "❌ Failed to deploy send-welcome-email"
        exit 1
    fi
fi

# Deploy award-xp function if it exists
if [ -d "supabase/functions/award-xp" ]; then
    echo "🏆 Deploying award-xp function..."
    supabase functions deploy award-xp --no-verify-jwt
    
    if [ $? -eq 0 ]; then
        echo "✅ award-xp deployed successfully"
    else
        echo "❌ Failed to deploy award-xp"
        exit 1
    fi
fi

echo ""
echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Test the contact addition flow in your app"
echo "2. Check the browser console for any remaining errors"
echo "3. Use the Contact Diagnostics panel in Admin to verify functionality"
echo ""
echo "🔗 Edge Function URLs:"
echo "   - check-contact-status: https://your-project.supabase.co/functions/v1/check-contact-status"
echo "   - send-welcome-email: https://your-project.supabase.co/functions/v1/send-welcome-email"
echo "   - award-xp: https://your-project.supabase.co/functions/v1/award-xp" 