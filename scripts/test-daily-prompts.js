#!/usr/bin/env node

/**
 * Test script for daily prompt notifications
 * Usage: node scripts/test-daily-prompts.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

async function testDailyPrompts() {
  console.log('🧪 Testing Daily Prompt Notifications...\n');

  try {
    console.log(`📡 Calling: ${SUPABASE_URL}/functions/v1/schedule-daily-prompts`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/schedule-daily-prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS: Daily prompt notifications triggered!');
      console.log('📊 Result:', JSON.stringify(data, null, 2));
      
      if (data.result?.notificationsSent) {
        console.log(`\n🎉 Sent notifications to ${data.result.notificationsSent} users!`);
        console.log(`📝 Current prompt: "${data.result.prompt}"`);
        console.log(`⏰ Next change: ${data.result.next_change_at}`);
      }
      
      console.log('\n📱 Check your app notifications to see the new daily prompt!');
    } else {
      console.log('❌ FAILED:', data.error || 'Unknown error');
      console.log('Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('\n🔧 Make sure you have set the environment variables:');
    console.log('   SUPABASE_URL=https://your-project.supabase.co');
    console.log('   SUPABASE_ANON_KEY=your-anon-key');
    console.log('\n   Or edit the values at the top of this script.');
  }
}

// Run the test
testDailyPrompts(); 