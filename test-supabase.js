import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://spqaxomajbwiqthluhur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcWF4b21hamJ3aXF0aGx1aHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDU3NzksImV4cCI6MjA5NTk4MTc3OX0.r4EYsIaBQv9PvS4-9gTorWirAC-L_51BJsKSFYTNKIw'
)

async function test() {
  const { data, error } = await supabase.from('parking_spots').select('*')
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Spots:', data)
  }
}

test()
