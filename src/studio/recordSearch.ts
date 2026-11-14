import type { NavigationModule } from '../moduleRegistry';

/** Search is local to records already loaded into the current session.
 *  It does NOT query the server, expand permissions, or certify record status.
 */
export interface SearchableRecord {
  id: string;
  title: string;
  summary: string;
  kind: string;
  module: NavigationModule;
  status?: string;
  illustrative?: boolean;
}
export interface RecordSearchResult extends SearchableRecord {
  relevance: number;
}
const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase().trim();

/** Deliberately bounded results avoid large dropdowns and excessive display work. */
export function searchLoadedRecords(records: readonly SearchableRecord[], query: string, limit = 15): RecordSearchResult[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length || terms.join('').length < 2 || limit <= 0) return [];
  return records.map(record => {
    const id = normalize(record.id);
    const title = normalize(record.title);
    const searchText = normalize([record.kind, record.id, record.title, record.summary, record.status].join(' '));
    if (!terms.every(term => searchText.includes(term))) return null;
    const relevance = terms.reduce((score, term) =>
      score + (id === term ? 40 : id.startsWith(term) ? 20 : 0)
      + (title.startsWith(term) ? 15 : title.includes(term) ? 8 : 0), 0);
    return { ...record, relevance };
  }).filter((record): record is RecordSearchResult => record !== null)
    .sort((a,b) => b.relevance - a.relevance || a.id.localeCompare(b.id))
    .slice(0, Math.min(30, Math.floor(limit)));
}
