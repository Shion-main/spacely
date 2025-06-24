import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()

    const { data: roomTypes, error } = await supabase
      .from('room_types')
      .select('type_id, type_name, display_name')
      .order('display_name')

    if (error) {
      console.error('Room types fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch room types' }, { status: 500 })
    }

    return NextResponse.json(roomTypes, { status: 200 })

  } catch (error) {
    console.error('Room types API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 