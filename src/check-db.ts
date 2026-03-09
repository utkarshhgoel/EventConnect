import { supabase } from './lib/supabase';

async function checkMessagesTable() {
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  console.log('Messages table check:', { data, error });
}

checkMessagesTable();
