const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugListingAmenities(postId) {
  console.log(`🔍 Debugging amenities for listing: ${postId}`)
  console.log('=' .repeat(50))

  try {
    // Check rooms table data
    console.log('\n📊 ROOMS TABLE DATA:')
    const { data: roomsData, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('post_id', postId)

    if (roomsError) {
      console.error('❌ Error fetching rooms:', roomsError)
    } else if (!roomsData || roomsData.length === 0) {
      console.log('❌ No rooms record found!')
    } else {
      console.log('✅ Rooms data found:')
      const room = roomsData[0]
      console.log(`   Number of rooms: ${room.number_of_rooms}`)
      console.log(`   Bathroom type: ${room.bathroom_type}`)
      console.log(`   Room type: ${room.room_type}`)
      console.log(`   Has WiFi: ${room.has_wifi}`)
      console.log(`   Has CCTV: ${room.has_cctv}`)
      console.log(`   Is AC: ${room.is_airconditioned}`)
      console.log(`   Has Parking: ${room.has_parking}`)
      console.log(`   Has Own Electric: ${room.has_own_electricity}`)
      console.log(`   Has Own Water: ${room.has_own_water}`)
    }

    // Check post_amenities table data
    console.log('\n🎯 POST_AMENITIES TABLE DATA:')
    const { data: amenitiesData, error: amenitiesError } = await supabase
      .from('post_amenities')
      .select('*')
      .eq('post_id', postId)

    if (amenitiesError) {
      console.error('❌ Error fetching amenities:', amenitiesError)
    } else if (!amenitiesData || amenitiesData.length === 0) {
      console.log('❌ No custom amenities found!')
    } else {
      console.log('✅ Custom amenities found:')
      amenitiesData.forEach((amenity, index) => {
        console.log(`   ${index + 1}. ${amenity.amenity_name} (${amenity.amenity_type})`)
      })
    }

    // Check full listing data as returned by API
    console.log('\n🔍 FULL API RESPONSE:')
    const { data: fullData, error: fullError } = await supabase
      .from('posts')
      .select(`
        post_id,
        title,
        rooms (
          number_of_rooms,
          bathroom_type,
          room_type,
          has_wifi,
          has_cctv,
          is_airconditioned,
          has_parking,
          has_own_electricity,
          has_own_water
        ),
        post_amenities (
          amenity_name,
          amenity_type
        )
      `)
      .eq('post_id', postId)
      .single()

    if (fullError) {
      console.error('❌ Error fetching full data:', fullError)
    } else {
      console.log('✅ Full data structure:')
      console.log(JSON.stringify(fullData, null, 2))
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Usage
const postId = process.argv[2]
if (!postId) {
  console.log('Usage: node debug-listing-amenities.js <post_id>')
  console.log('Example: node debug-listing-amenities.js 123e4567-e89b-12d3-a456-426614174000')
  process.exit(1)
}

debugListingAmenities(postId) 