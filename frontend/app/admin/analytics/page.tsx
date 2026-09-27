import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { CostDashboard } from '@/components/admin/cost-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  if (!isSupabaseConfigured()) {
    return <CostDashboard logs={[]} totalCost={0} totalTokens={0} />;
  }

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('ai_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const totalCost = logs?.reduce((sum, log) => sum + Number(log.cost_usd || 0), 0) || 0;
  const totalTokens = logs?.reduce((sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0) || 0;

  return (
    <CostDashboard
      logs={logs || []}
      totalCost={totalCost}
      totalTokens={totalTokens}
    />
  );
}
