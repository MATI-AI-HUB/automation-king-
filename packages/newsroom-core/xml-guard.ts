const ENTITY_RE = /<!ENTITY/i;
const DOCTYPE_RE = /<!DOCTYPE/i;
const NESTED_LT = /(<[^>]*){50,}/;

export function assertSafeXml(xml: string, maxBytes = 2_000_000): void {
  if (typeof xml !== 'string') throw new Error('invalid_xml');
  if (xml.length > maxBytes) throw new Error('xml_too_large');
  if (ENTITY_RE.test(xml) || DOCTYPE_RE.test(xml)) throw new Error('xml_entity_forbidden');
  const depth = xml.split('<').length - 1;
  if (depth > 20_000) throw new Error('xml_too_nested');
  if (NESTED_LT.test(xml.slice(0, 50_000)) && depth > 5_000) throw new Error('xml_too_nested');
}
