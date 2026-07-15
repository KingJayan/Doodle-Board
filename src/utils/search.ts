import { Card, Board } from '../models/card.model';

export interface ParsedQuery {
  terms: string[];
  excludes: string[];
  boardFilter: string | null;
  tagFilter: string | null;
  titleOnly: boolean;
  pinned: boolean | null;
  colorFilter: string | null;
}

const COLOR_VALS: Record<string, string[]> = {
  yellow: ['#fff9c4'], purple: ['#e1bee7'], green: ['#c8e6c9'],
  blue: ['#bbdefb'], orange: ['#ffccbc', '#ffab91'], white: ['#ffffff'],
};

export function parseQuery(raw: string): ParsedQuery {
  const terms: string[] = [], excludes: string[] = [];
  let boardFilter: string | null = null, tagFilter: string | null = null;
  let titleOnly = false, pinned: boolean | null = null, colorFilter: string | null = null;
  for (const tok of raw.trim().split(/\s+/).filter(Boolean)) {
    const lo = tok.toLowerCase();
    if (tok.length > 1 && tok[0] === '-') excludes.push(lo.slice(1));
    else if (lo.startsWith('board:')) boardFilter = lo.slice(6);
    else if (lo.startsWith('tag:')) tagFilter = lo.slice(4);
    else if (tok[0] === '#' && tok.length > 1) tagFilter = lo.slice(1);
    else if (lo.startsWith('title:')) { titleOnly = true; const v = lo.slice(6); if (v) terms.push(v); }
    else if (lo === 'is:pinned') pinned = true;
    else if (lo.startsWith('color:')) colorFilter = lo.slice(6);
    else terms.push(lo);
  }
  return { terms, excludes, boardFilter, tagFilter, titleOnly, pinned, colorFilter };
}

export function matchesQuery(card: Card, board: Board, q: ParsedQuery): boolean {
  if (q.boardFilter && !board.name.toLowerCase().includes(q.boardFilter)) return false;
  if (q.tagFilter && !card.tags.some(t => t.toLowerCase().includes(q.tagFilter!))) return false;
  if (q.pinned === true && !card.isPinned) return false;
  if (q.colorFilter) {
    const targets = COLOR_VALS[q.colorFilter] ??
      Object.entries(COLOR_VALS).find(([k]) => k.startsWith(q.colorFilter!))?.[1];
    if (targets && !targets.includes(card.color)) return false;
  }
  for (const ex of q.excludes) {
    if (card.title.toLowerCase().includes(ex) || card.content.toLowerCase().includes(ex)) return false;
  }
  if (!q.terms.length) return true;
  return q.terms.every(t =>
    q.titleOnly
      ? card.title.toLowerCase().includes(t)
      : card.title.toLowerCase().includes(t) ||
        card.content.toLowerCase().includes(t) ||
        card.tags.some(g => g.toLowerCase().includes(t))
  );
}
