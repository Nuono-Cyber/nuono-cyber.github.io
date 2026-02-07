-- Delete the 16 most recently created posts (extras from the bug)
-- Keep only the first 41 posts by removing the newest ones
DELETE FROM public.instagram_posts
WHERE id IN (
  SELECT id FROM public.instagram_posts
  ORDER BY created_at DESC
  LIMIT 16
);
