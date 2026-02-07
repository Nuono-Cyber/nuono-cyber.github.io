import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupExtraPosts() {
  try {
    console.log('Fetching all posts...')
    
    // Get all posts ordered by creation date (newest last)
    const { data: allPosts, error: fetchError } = await supabase
      .from('instagram_posts')
      .select('id, post_id, username, created_at')
      .order('created_at', { ascending: true })

    if (fetchError) throw fetchError

    const totalPosts = allPosts?.length || 0
    console.log(`Total posts in database: ${totalPosts}`)

    // We need to delete the last 16 posts (most recently added)
    const postsToDelete = totalPosts - 41
    
    if (postsToDelete <= 0) {
      console.log('No posts to delete. Database already has 41 or fewer posts.')
      return
    }

    console.log(`\nPosts to delete: ${postsToDelete}`)
    console.log('Posts that will be deleted:')
    
    // Get the IDs of posts to delete (the oldest 16 in the extra batch)
    const idsToDelete = allPosts!
      .slice(-postsToDelete) // Get the last N posts (most recently added)
      .map(p => p.id)

    idsToDelete.forEach((id, index) => {
      const post = allPosts!.find(p => p.id === id)
      console.log(`  ${index + 1}. ${post?.post_id} (${post?.username}) - created: ${post?.created_at}`)
    })

    // Confirm deletion
    console.log('\nDeleting posts...')
    
    const { error: deleteError } = await supabase
      .from('instagram_posts')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) throw deleteError

    console.log(`\n✅ Successfully deleted ${idsToDelete.length} posts!`)
    
    // Verify
    const { data: remainingPosts, error: verifyError } = await supabase
      .from('instagram_posts')
      .select('id')

    if (verifyError) throw verifyError
    
    console.log(`Remaining posts: ${remainingPosts?.length}`)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

cleanupExtraPosts()
