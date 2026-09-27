import {
  createOrUpdateWealthEntries,
  createWealthLineItem,
  createWealthSection,
  getWealthSectionsByUserId,
} from '@kanak/api';
import { parseWealthCsv } from './wealth-csv';

export type WealthImportResult = {
  dates: number;
  entries: number;
  createdSections: string[];
  createdLineItems: string[];
  matchedLineItems: number;
};

/** Names in the sheet differ cosmetically from the app's; compare on this. */
const normalize = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Sheet section name (normalized) -> section name used in the app. */
const SECTION_ALIASES: Record<string, string> = {
  savingsaccounts: 'Savings',
  depositsaccounts: 'Fixed Deposits',
  liability: 'Liabilities',
};

/** `<normalized sheet section>|<normalized sheet item>` -> where it really belongs. */
const LINE_ITEM_ALIASES: Record<string, { section?: string; name: string }> = {
  'savingsaccounts|vidhyaaxisbank': { name: 'Vidhya Axis' },
  'shares|vigneshstocks': { name: 'Vignesh Shares' },
  'shares|vidhyastocks': { name: 'Vidhya Shares' },
  'shares|vigneshmutualfunds': {
    section: 'Mutual Funds',
    name: 'Vignesh Mutual Fund',
  },
  'shares|vidhyamutualfunds': {
    section: 'Mutual Funds',
    name: 'Vidhya Mutual Fund',
  },
  'liability|vidhyahouseloan': { name: 'Vidhya' },
};

function dateFromKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Imports a "Complete Wealth" sheet export. Sections and line items already in the
 * app are reused (matched on normalized name, via the alias tables above); anything
 * genuinely new is created. Values are upserted per date, so re-running is safe.
 */
export async function importWealthCsv(
  userId: string,
  csv: string
): Promise<WealthImportResult> {
  const parsed = parseWealthCsv(csv);
  if (parsed.sections.length === 0) {
    throw new Error('No sections with line items found in the CSV');
  }

  // Flatten to (target section, target line item, amounts), applying the aliases.
  const targets = parsed.sections.flatMap((section) =>
    section.lineItems.map((lineItem) => {
      const alias =
        LINE_ITEM_ALIASES[
          `${normalize(section.name)}|${normalize(lineItem.name)}`
        ];
      return {
        sectionName:
          alias?.section ??
          SECTION_ALIASES[normalize(section.name)] ??
          section.name,
        operation: section.operation,
        lineItemName: alias?.name ?? lineItem.name,
        amounts: lineItem.amounts,
      };
    })
  );

  const existingSections = await getWealthSectionsByUserId(userId);
  const sectionByName = new Map<string, any>(
    existingSections.map((s) => [normalize(s.name), s])
  );
  const lineItemIdByKey = new Map<string, string>();
  for (const section of existingSections) {
    for (const lineItem of section.lineItems ?? []) {
      // Duplicate names exist in the app; first one wins.
      const k = `${normalize(section.name)}|${normalize(lineItem.name)}`;
      if (!lineItemIdByKey.has(k)) lineItemIdByKey.set(k, lineItem.id);
    }
  }

  let nextSectionOrder =
    existingSections.reduce((max, s) => Math.max(max, s.order ?? 0), -1) + 1;
  const nextLineItemOrder = new Map<string, number>(
    existingSections.map((s) => [
      normalize(s.name),
      (s.lineItems ?? []).reduce(
        (max: number, li: any) => Math.max(max, li.order ?? 0),
        -1
      ) + 1,
    ])
  );
  const createdSections: string[] = [];
  const createdLineItems: string[] = [];
  let matchedLineItems = 0;

  // Resolve every target to a line item id, creating sections/items as needed.
  const lineItemIdByTarget = new Map<number, string>();
  for (const [index, target] of targets.entries()) {
    const sectionKey = normalize(target.sectionName);
    let section = sectionByName.get(sectionKey);
    if (!section) {
      section = await createWealthSection(userId, {
        name: target.sectionName,
        operation: target.operation,
        order: nextSectionOrder++,
      });
      sectionByName.set(sectionKey, section);
      nextLineItemOrder.set(sectionKey, 0);
      createdSections.push(target.sectionName);
    }

    const lineItemKey = `${sectionKey}|${normalize(target.lineItemName)}`;
    let lineItemId = lineItemIdByKey.get(lineItemKey);
    if (lineItemId) {
      matchedLineItems++;
    } else {
      const order = nextLineItemOrder.get(sectionKey) ?? 0;
      const lineItem = await createWealthLineItem(userId, {
        sectionId: section.id,
        name: target.lineItemName,
        order,
      });
      nextLineItemOrder.set(sectionKey, order + 1);
      lineItemId = lineItem.id;
      lineItemIdByKey.set(lineItemKey, lineItemId!);
      createdLineItems.push(`${target.sectionName} / ${target.lineItemName}`);
    }
    lineItemIdByTarget.set(index, lineItemId!);
  }

  // Group amounts by date, then one upsert per date.
  const byDate = new Map<string, { lineItemId: string; amount: number }[]>();
  for (const [index, target] of targets.entries()) {
    const lineItemId = lineItemIdByTarget.get(index)!;
    for (const [dateKey, amount] of Object.entries(target.amounts)) {
      const list = byDate.get(dateKey) ?? [];
      list.push({ lineItemId, amount });
      byDate.set(dateKey, list);
    }
  }

  let entries = 0;
  // ponytail: sequential, one mutation per date (~40 for a full sheet).
  // Batch inside Convex if this ever gets slow enough to matter.
  for (const [dateKey, dateEntries] of byDate) {
    await createOrUpdateWealthEntries(userId, {
      date: dateFromKey(dateKey),
      entries: dateEntries,
    });
    entries += dateEntries.length;
  }

  return {
    dates: byDate.size,
    entries,
    createdSections,
    createdLineItems,
    matchedLineItems,
  };
}
