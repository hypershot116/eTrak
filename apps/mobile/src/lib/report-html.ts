import { categoryEmoji } from './category-display';
import type { Category, Expense } from '@etrak/shared';

import { formatMinor } from './money';

export type ReportStyle = 'summary' | 'detailed' | 'category';

export const reportStyles: { key: ReportStyle; label: string; hint: string }[] = [
  { key: 'summary', label: 'Summary', hint: 'Totals and each category’s share' },
  { key: 'detailed', label: 'Detailed list', hint: 'Every expense, by date' },
  { key: 'category', label: 'By category', hint: 'Expenses grouped under each category' },
];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const dateText = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function groupByCategory(list: Expense[]) {
  const m = new Map<string, Expense[]>();
  for (const e of list) {
    const l = m.get(e.categoryId) ?? [];
    l.push(e);
    m.set(e.categoryId, l);
  }
  return [...m.entries()]
    .map(([id, items]) => ({ id, items, total: items.reduce((s, e) => s + e.amountMinor, 0) }))
    .sort((a, b) => b.total - a.total);
}

type Input = {
  style: ReportStyle;
  monthTitle: string;
  expenses: Expense[];
  categories: Map<string, Category>;
  accent: string; // CSS color, e.g. "rgb(99 102 241)"
};

export function buildReportHtml({ style, monthTitle, expenses, categories, accent }: Input) {
  const byCurrency = new Map<string, Expense[]>();
  for (const e of expenses) {
    const l = byCurrency.get(e.currency) ?? [];
    l.push(e);
    byCurrency.set(e.currency, l);
  }

  const catLabel = (id: string) => {
    const c = categories.get(id);
    return `${esc(categoryEmoji(c))} ${esc(c?.name ?? 'Unknown')}`;
  };

  const sections = [...byCurrency.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([code, list]) => {
      const total = list.reduce((s, e) => s + e.amountMinor, 0);
      const money = (n: number) => esc(formatMinor(n, code));
      const row = (e: Expense, withCategory: boolean) =>
        `<tr><td>${dateText(e.spentAt)}</td>${
          withCategory ? `<td>${catLabel(e.categoryId)}</td>` : ''
        }<td>${esc(e.note)}</td><td class="r">${money(e.amountMinor)}</td></tr>`;

      let body = '';
      if (style === 'summary') {
        const rows = groupByCategory(list)
          .map(
            (g) =>
              `<tr><td>${catLabel(g.id)}</td><td class="r">${
                total > 0 ? Math.round((g.total / total) * 100) : 0
              }%</td><td class="r">${money(g.total)}</td></tr>`
          )
          .join('');
        body = `<table><thead><tr><th>Category</th><th class="r">Share</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
      } else if (style === 'detailed') {
        const rows = [...list]
          .sort((a, b) => a.spentAt - b.spentAt)
          .map((e) => row(e, true))
          .join('');
        body = `<table><thead><tr><th>Date</th><th>Category</th><th>Note</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
      } else {
        body = groupByCategory(list)
          .map((g) => {
            const rows = [...g.items]
              .sort((a, b) => a.spentAt - b.spentAt)
              .map((e) => row(e, false))
              .join('');
            return `<h3>${catLabel(g.id)} <span>${money(g.total)}</span></h3><table><thead><tr><th>Date</th><th>Note</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
          })
          .join('');
      }

      return `<section><h2>${esc(code)} <span>${money(total)} · ${list.length} ${
        list.length === 1 ? 'expense' : 'expenses'
      }</span></h2>${body}</section>`;
    })
    .join('');

  const styleName = reportStyles.find((s) => s.key === style)?.label ?? '';

  return `<!doctype html><html><head><meta charset="utf-8"><title>eTrak ${esc(monthTitle)}</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #18181b; font-size: 12px; }
  header { border-bottom: 4px solid ${accent}; padding-bottom: 10px; margin-bottom: 18px; }
  header h1 { margin: 0; font-size: 24px; color: ${accent}; }
  header p { margin: 4px 0 0; color: #71717a; }
  section { margin-bottom: 22px; }
  h2 { display: flex; justify-content: space-between; font-size: 16px; margin: 0 0 8px; }
  h2 span, h3 span { font-weight: 600; color: #52525b; font-size: 13px; }
  h3 { display: flex; justify-content: space-between; font-size: 13px; margin: 14px 0 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; color: #71717a; border-bottom: 1px solid #d4d4d8; padding: 4px 6px; }
  td { padding: 5px 6px; border-bottom: 1px solid #e4e4e7; }
  tr { page-break-inside: avoid; }
  .r { text-align: right; white-space: nowrap; }
  footer { margin-top: 24px; color: #a1a1aa; font-size: 10px; }
</style></head><body>
<header><h1>eTrak · ${esc(monthTitle)}</h1><p>${esc(styleName)} report</p></header>
${sections}
<footer>Generated by eTrak on ${esc(new Date().toLocaleDateString())}</footer>
</body></html>`;
}
