const { createClient } = require('@supabase/supabase-js');

// Hostinger passes environment variables automatically
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Using 'products' as the table name
const tableName = 'products';

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.warn('Supabase connection check:', error.message);
    } else {
      console.log('Connected to Supabase successfully. Row count:', data.length);
    }
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
  }
}

testConnection();

module.exports = { supabase };
