'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/require-admin';
import { createClient } from '@/lib/supabase/server';

export async function moderateArticleComment(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error('Unauthorized');

  const id = String(formData.get('id') || '').trim();
  const status = String(formData.get('status') || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid comment ID');
  }
  if (status !== 'approved' && status !== 'rejected') {
    throw new Error('Invalid moderation status');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('article_comments')
    .update({
      status,
      moderated_at: new Date().toISOString(),
      moderated_by: admin.id,
    })
    .eq('id', id)
    .eq('status', 'pending');

  if (error) throw new Error('Comment moderation failed');

  revalidatePath('/admin/comments');
}
