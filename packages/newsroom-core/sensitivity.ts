export type SensitivityFlag = string;

export interface SensitivityModel {
  classify(text: string): Promise<SensitivityFlag[]>;
}

const RULES: { flag: SensitivityFlag; re: RegExp }[] = [
  { flag: 'murder', re: /\b(murder|homicide|killed|killing|হত্যা)\b/i },
  { flag: 'terrorism', re: /\b(terror|bombing|extremist|সন্ত্রাস)\b/i },
  { flag: 'massacre', re: /\b(massacre|genocide|গণহত্যা)\b/i },
  { flag: 'war_casualties', re: /\b(casualt|war dead|নিহত.*যুদ্ধ)\b/i },
  { flag: 'sexual_violence', re: /\b(rape|sexual assault|ধর্ষণ)\b/i },
  { flag: 'minors', re: /\b(child|minor|under-?1[0-8]|শিশু|নাবালক)\b/i },
  { flag: 'suicide', re: /\b(suicide|আত্মহত্যা)\b/i },
  { flag: 'communal', re: /\b(communal|sectarian|ethnic tension|সাম্প্রদায়িক)\b/i },
  { flag: 'bangladesh_politics', re: /\b(bangladesh.*(election|minister|awami|bnp)|বাংলাদেশ.*(নির্বাচন|রাজনীতি))\b/i },
  { flag: 'elections', re: /\b(election|vote rigging|নির্বাচন)\b/i },
  { flag: 'head_of_state', re: /\b(president|prime minister|head of state|রাষ্ট্রপতি|প্রধানমন্ত্রী)\b/i },
  { flag: 'health_claim', re: /\b(vaccine|epidemic|outbreak|cure|মহামারী)\b/i },
  { flag: 'market_sensitive', re: /\b(insider|stock crash|interest rate|শেয়ার বাজার)\b/i },
  { flag: 'named_accused', re: /\b(accused|defendant|অভিযুক্ত)\b/i },
  { flag: 'court_crime', re: /\b(court|trial|chargesheet|আদালত)\b/i },
  { flag: 'graphic', re: /\b(graphic|gore|beheaded)\b/i },
];

export function classifySensitivityRules(text: string): SensitivityFlag[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  const flags: SensitivityFlag[] = [];
  for (const rule of RULES) {
    if (rule.re.test(text)) flags.push(rule.flag);
  }
  return flags;
}

export class NullSensitivityModel implements SensitivityModel {
  async classify(): Promise<SensitivityFlag[]> {
    return [];
  }
}

export async function classifySensitivity(
  text: string,
  model?: SensitivityModel,
): Promise<SensitivityFlag[]> {
  const rules = classifySensitivityRules(text);
  const extra = model ? await model.classify(text) : [];
  return [...new Set([...rules, ...extra])];
}
