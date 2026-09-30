type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: unknown) => Promise<{ error: { message?: string; code?: string } | null }>;
    };
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{
          data: { text_bn?: string; is_active?: boolean; updated_at?: string } | null;
          error: { message?: string; code?: string } | null;
        }>;
      };
    };
  };
};

function missingRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    message.includes('could not find the function') ||
    message.includes('does not exist')
  );
}

export type TickerState = {
  active: boolean;
  text: string;
  updated_at: string;
  persisted: boolean;
};

export async function readBreakingTicker(client: RpcClient): Promise<TickerState> {
  const { data, error } = await client
    .from('breaking_ticker')
    .select('text_bn, is_active, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) {
    return {
      active: false,
      text: '',
      updated_at: new Date().toISOString(),
      persisted: false,
    };
  }
  return {
    active: Boolean(data.is_active),
    text: data.text_bn || '',
    updated_at: data.updated_at || new Date().toISOString(),
    persisted: true,
  };
}

export async function writeBreakingTicker(
  client: RpcClient,
  input: { active: boolean; text: string },
): Promise<TickerState> {
  const text = input.text;
  const rpc = await client.rpc('set_breaking_ticker', {
    p_text: text,
    p_active: input.active,
  });
  if (rpc.error && missingRpc(rpc.error)) {
    const fallback = await client.rpc('set_breaking_ticker', { p_text: text });
    if (fallback.error && missingRpc(fallback.error)) {
      const { error } = await client
        .from('breaking_ticker')
        .update({ text_bn: text, is_active: input.active, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
    } else if (fallback.error) {
      throw fallback.error;
    } else if (!input.active) {
      const { error } = await client
        .from('breaking_ticker')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
    }
  } else if (rpc.error) {
    throw rpc.error;
  }
  return readBreakingTicker(client);
}
