create index if not exists idx_instagram_posts_post_type on public.instagram_posts(post_type);
create index if not exists idx_instagram_posts_username_published_at on public.instagram_posts(username, published_at desc);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);
create index if not exists idx_internal_messages_thread_created_at
  on public.internal_messages(sender_id, recipient_id, created_at);
create index if not exists idx_password_reset_tokens_token_unused
  on public.password_reset_tokens(token)
  where used_at is null;
