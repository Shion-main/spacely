import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: postId } = params

    const { data: favorite, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Favorite check error:', error)
      return NextResponse.json({ error: 'Failed to check favorite status' }, { status: 500 })
    }

    return NextResponse.json({ isFavorite: !!favorite }, { status: 200 })

  } catch (error) {
    console.error('Favorite status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: postId } = params

    // Check if post exists and is approved
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('post_id')
      .eq('post_id', postId)
      .eq('approval_status', 'approved')
      .eq('archived', false)
      .eq('is_deleted', false)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Listing not found or not available' }, { status: 404 })
    }

    // Check if already favorited
    const { data: existingFavorite } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single()

    if (existingFavorite) {
      // If it exists, delete it (un-favorite)
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)

      if (deleteError) {
        console.error('Favorite deletion error:', deleteError)
        return NextResponse.json({ error: 'Failed to remove from favorites' }, { status: 500 })
      }
      return NextResponse.json({ message: 'Removed from favorites', isFavorited: false }, { status: 200 })
    }

    // Create new favorite
    const { error: insertError } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        post_id: postId
      })

    if (insertError) {
      console.error('Favorite creation error:', insertError)
      return NextResponse.json({ error: 'Failed to add to favorites' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Added to favorites', isFavorited: true }, { status: 201 })

  } catch (error) {
    console.error('Add favorite API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: postId } = params

    // Soft delete the favorite
    const { error } = await supabase
      .from('favorites')
      .update({ is_deleted: true })
      .eq('user_id', user.id)
      .eq('post_id', postId)

    if (error) {
      console.error('Favorite deletion error:', error)
      return NextResponse.json({ error: 'Failed to remove from favorites' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Removed from favorites' }, { status: 200 })

  } catch (error) {
    console.error('Remove favorite API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 