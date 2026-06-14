import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kypmtmanuekyzbfmedxb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_D0BFrPUsz9onQ4l4bWj7mA_FDa21oXb';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const users = [
  {
    email: 'ft.usera@test.local',
    password: 'Test123456!',
  },
  {
    email: 'ft.userb@test.local',
    password: 'Test123456!',
  },
];

for (const user of users) {
  const { data, error } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
  });

  if (error) {
    console.error(`Failed to create ${user.email}:`, error.message);
  } else {
    console.log(`Created ${user.email}:`, data.user?.id);
  }
}