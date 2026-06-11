const supabaseUrl = 'https://spqaxomajbwiqthluhur.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcWF4b21hamJ3aXF0aGx1aHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDU3NzksImV4cCI6MjA5NTk4MTc3OX0.r4EYsIaBQv9PvS4-9gTorWirAC-L_51BJsKSFYTNKIw';

async function run() {
  const url = `${supabaseUrl}/rest/v1/operator_sessions?select=id,entry_time,exit_time,created_at,status,total_amount`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  
  console.log("Response:", JSON.stringify(data, null, 2));
  return;
  
  // Count by date
  const counts = {};
  data.forEach(s => {
    const d = new Date(s.created_at).toISOString().split('T')[0];
    counts[d] = (counts[d] || 0) + 1;
  });
  console.log("Counts by created_at date:", counts);
  
  const countsEntry = {};
  data.forEach(s => {
    if (!s.entry_time) return;
    const d = new Date(s.entry_time).toISOString().split('T')[0];
    countsEntry[d] = (countsEntry[d] || 0) + 1;
  });
  console.log("Counts by entry_time date:", countsEntry);
}

run();
