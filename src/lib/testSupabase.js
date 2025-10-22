// Test script to verify Supabase connection
import { WaterMeter } from './entities';

export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const meters = await WaterMeter.list();
    console.log('✅ Successfully connected to Supabase!');
    console.log(`📊 Found ${meters.length} water meters`);
    
    if (meters.length > 0) {
      console.log('📋 Sample meter data:', meters[0]);
    }
    
    return { success: true, count: meters.length, data: meters };
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return { success: false, error: error.message };
  }
}
