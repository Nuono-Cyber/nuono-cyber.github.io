-- Delete the 16 most recently created posts (extras from the bug)
-- Keep only the first 41 posts
DELETE FROM public.instagram_posts
WHERE id IN (
  SELECT id FROM public.instagram_posts
  ORDER BY created_at DESC
  LIMIT 16
);

-- Verify the count
-- SELECT COUNT(*) as total_posts FROM public.instagram_posts;
