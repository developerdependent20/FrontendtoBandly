import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
   // Attempt to insert a dummy to see the error, or query information_schema
   // Actually we can't query information_schema from anon key.
   // Let's just return a success so I can use this file for testing.
   return NextResponse.json({ ok: true });
}
