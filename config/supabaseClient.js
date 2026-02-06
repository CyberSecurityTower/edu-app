import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ضع مفاتيحك هنا (Anon Key للتطبيق، وليس Service Role!)
const supabaseUrl = 'https://wlghgzsgsefvwtdysqsw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZ2hnenNnc2Vmdnd0ZHlzcXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjQ4NzcsImV4cCI6MjA3OTM0MDg3N30.yYs-zkIgrJaZmauidrWBMyF_1pbUgYP9G7iaDscPptE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce', 

  },
});