import type { SupabaseClient } from '@supabase/supabase-js';

export async function updateOwnNotificationRead(
  client: SupabaseClient,
  notificationId: string,
  isRead: boolean,
) {
  return client
    .from('notifications')
    .update({ is_read: isRead })
    .eq('id', notificationId)
    .select('id, is_read')
    .maybeSingle();
}

export async function retractArticle(client: SupabaseClient, articleId: string) {
  const retracted = await client
    .from('articles')
    .update({ status: 'retracted', updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .select('id, status')
    .maybeSingle();
  if (!retracted.error) return retracted;

  const message = (retracted.error.message || '').toLowerCase();
  const statusRejected =
    message.includes('check') ||
    message.includes('retracted') ||
    message.includes('invalid') ||
    message.includes('23514');
  if (!statusRejected) return retracted;

  return client
    .from('articles')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .select('id, status')
    .maybeSingle();
}

export async function archiveArticle(client: SupabaseClient, articleId: string) {
  return client
    .from('articles')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .select('id, status')
    .maybeSingle();
}
