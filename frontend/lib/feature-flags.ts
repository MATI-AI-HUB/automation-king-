export const V2_REDESIGN_COOKIE = 'ff_v2_redesign';
export const V2_REDESIGN_HEADER = 'x-ff-v2-redesign';

export function isV2RedesignEnabled(value: string | null | undefined): boolean {
  return value === 'true';
}
