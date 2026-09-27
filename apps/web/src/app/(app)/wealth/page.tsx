'use client';

import { DeleteLineItemModal } from '@/components/wealth/delete-line-item-modal';
import { DeleteSectionModal } from '@/components/wealth/delete-section-modal';
import { WealthDateCell } from '@/components/wealth/wealth-date-cell';
import { WealthDatePickerModal } from '@/components/wealth/wealth-date-picker-modal';
import { WealthLineItemModal } from '@/components/wealth/wealth-line-item-modal';
import { WealthSectionModal } from '@/components/wealth/wealth-section-modal';
import { importWealthCsv } from '@/lib/wealth-import';
import { NotReadyForMobile } from '@kanak/components';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Spinner,
  useDevice,
} from '@kanak/ui';
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconChevronsDown,
  IconChevronsUp,
  IconEdit,
  IconGripVertical,
  IconPlus,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
  IconUpload,
} from '@tabler/icons-react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface WealthSection {
  id: string;
  name: string;
  color?: string;
  operation?: 'add' | 'subtract';
  order: number;
  lineItems: WealthLineItem[];
}

interface WealthLineItem {
  id: string;
  sectionId: string;
  name: string;
  order: number;
}

interface WealthEntry {
  id: string;
  lineItemId: string;
  date: string;
  amount: number;
  updatedAt: string;
}

interface WealthData {
  sections: (WealthSection & {
    lineItems: (WealthLineItem & { entries?: WealthEntry[] })[];
  })[];
  entries: (WealthEntry & {
    lineItem: { id: string; section: { id: string } };
  })[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const DATE_RANGE_OPTIONS = [
  { value: 'current-year', label: 'Current year' },
  { value: 'last-12-months', label: 'Last 12 months' },
  { value: 'last-3-years', label: 'Last 3 years' },
  { value: 'all', label: 'All data' },
] as const;

type DateRangeOption = (typeof DATE_RANGE_OPTIONS)[number]['value'];

function getRangeBounds(range: DateRangeOption): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  // Far end so future-dated entries are never cut off.
  const endDate = new Date(now.getFullYear() + 10, 11, 31);

  switch (range) {
    case 'current-year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
      };
    case 'last-12-months':
      return {
        startDate: new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        ),
        endDate,
      };
    case 'last-3-years':
      return {
        startDate: new Date(
          now.getFullYear() - 3,
          now.getMonth(),
          now.getDate()
        ),
        endDate,
      };
    case 'all':
    default:
      return { startDate: new Date(0), endDate };
  }
}

/** YYYY-MM-DD to UTC midnight, so a date key never shifts with the timezone. */
function parseUTCDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export default function WealthPage() {
  const convex = useConvex();
  const createWealthSection = useMutation(api.wealth.createWealthSection);
  const createWealthLineItem = useMutation(api.wealth.createWealthLineItem);
  const createOrUpdateWealthEntries = useMutation(
    api.wealth.createOrUpdateWealthEntries
  );
  const updateWealthEntriesDate = useMutation(
    api.wealth.updateWealthEntriesDate
  );
  const updateWealthSectionsOrder = useMutation(
    api.wealth.updateWealthSectionsOrder
  );
  const updateWealthLineItemsOrder = useMutation(
    api.wealth.updateWealthLineItemsOrder
  );
  const { isDesktop } = useDevice();
  const router = useRouter();
  const [wealthData, setWealthData] = useState<WealthData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dates, setDates] = useState<Date[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [entryValues, setEntryValues] = useState<
    Record<string, Record<string, number>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const initialEntryValuesRef = useRef<Record<string, Record<string, number>>>(
    {}
  );
  const hasUserMadeChangeRef = useRef(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<{
    id: string;
    name: string;
    lineItemCount: number;
  } | null>(null);
  const [lineItemModalOpen, setLineItemModalOpen] = useState(false);
  const [deleteLineItemModalOpen, setDeleteLineItemModalOpen] = useState(false);
  const [lineItemToDelete, setLineItemToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingSection, setEditingSection] = useState<WealthSection | null>(
    null
  );
  const [editingLineItem, setEditingLineItem] = useState<{
    lineItem: WealthLineItem;
    sectionId: string;
  } | null>(null);
  const [selectedSectionForLineItem, setSelectedSectionForLineItem] = useState<
    string | null
  >(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedLineItemId, setDraggedLineItemId] = useState<string | null>(
    null
  );
  const [isReordering, setIsReordering] = useState(false);
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dates will be extracted from entries fetched from API

  // Helper: format date as YYYY-MM-DD in UTC (constant, no timezone conversion)
  const formatDateKey = useCallback((date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Helper: parse YYYY-MM-DD to Date at UTC midnight (constant, no timezone conversion)
  const parseDateKey = useCallback((dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }, []);

  // Sections and the range's entries. The grid keeps its own `entryValues`
  // because cells are editable with auto-save, so the query result is copied
  // into local state on load rather than rendered directly.
  const { startDate: rangeStart, endDate: rangeEnd } = useMemo(
    () => getRangeBounds(dateRange),
    [dateRange]
  );
  const sectionsResult = useQuery(api.wealth.getWealthSectionsByUserId, {});
  const entriesResult = useQuery(api.wealth.getWealthEntriesByDateRange, {
    startDate: rangeStart.getTime(),
    endDate: rangeEnd.getTime(),
  });
  const loading = sectionsResult === undefined || entriesResult === undefined;

  useEffect(() => {
    if (sectionsResult === undefined || entriesResult === undefined) return;

    setWealthData({
      sections: sectionsResult,
      entries: entriesResult,
    } as unknown as WealthData);

    const uniqueDates = new Set<string>();
    const values: Record<string, Record<string, number>> = {};
    for (const entry of entriesResult) {
      const dateKey = formatDateKey(new Date(entry.date));
      uniqueDates.add(dateKey);
      values[dateKey] ??= {};
      values[dateKey][entry.lineItemId] = entry.amount;
    }

    // Latest first.
    setDates(
      Array.from(uniqueDates)
        .map(parseDateKey)
        .sort((a, b) => b.getTime() - a.getTime())
    );
    setEntryValues(values);
    initialEntryValuesRef.current = JSON.parse(JSON.stringify(values));
    hasUserMadeChangeRef.current = false;
    // Let the state settle before auto-save starts watching, or loading the
    // data would look like an edit.
    const timer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 500);
    return () => clearTimeout(timer);
  }, [sectionsResult, entriesResult, formatDateKey, parseDateKey]);

  const lastFetchKeyRef = useRef<string | null>(null);

  // Initial data fetch

  // Dates are now extracted from entries, so we don't need to refetch on date changes

  // Handle entry value change
  const handleEntryChange = useCallback(
    (lineItemId: string, date: Date, value: number) => {
      const dateKey = formatDateKey(date);
      // Mark that user has made a change
      hasUserMadeChangeRef.current = true;
      setEntryValues((prev) => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [lineItemId]: value,
        },
      }));
    },
    [formatDateKey]
  );

  // Helper function to deep compare entry values
  const hasEntryValuesChanged = useCallback(
    (
      current: Record<string, Record<string, number>>,
      initial: Record<string, Record<string, number>>
    ): boolean => {
      // Get all unique date keys from both objects
      const allDateKeys = new Set([
        ...Object.keys(current),
        ...Object.keys(initial),
      ]);

      for (const dateKey of allDateKeys) {
        const currentEntries = current[dateKey] || {};
        const initialEntries = initial[dateKey] || {};

        // Get all unique line item IDs for this date
        const allLineItemIds = new Set([
          ...Object.keys(currentEntries),
          ...Object.keys(initialEntries),
        ]);

        for (const lineItemId of allLineItemIds) {
          const currentValue = currentEntries[lineItemId] || 0;
          const initialValue = initialEntries[lineItemId] || 0;
          if (currentValue !== initialValue) {
            return true;
          }
        }
      }

      return false;
    },
    []
  );

  // Save all entries for all dates (only dates that have at least one non-zero value)
  const saveAllEntries = useCallback(async () => {
    if (!wealthData || dates.length === 0) return;

    // Check if values have actually changed from initial load
    if (!hasEntryValuesChanged(entryValues, initialEntryValuesRef.current)) {
      return;
    }

    setIsSaving(true);
    try {
      // Save entries for each date that has at least one non-zero value AND has changed
      const savePromises = dates
        .filter((date) => {
          const dateKey = formatDateKey(date);
          const dateEntries = entryValues[dateKey];
          if (!dateEntries) return false;
          // Check if at least one entry has a non-zero value
          return Object.values(dateEntries).some((amount) => amount > 0);
        })
        .filter((date) => {
          // Only save dates that have actually changed
          const dateKey = formatDateKey(date);
          const currentEntries = entryValues[dateKey] || {};
          const initialEntries = initialEntryValuesRef.current[dateKey] || {};

          // Check if any value in this date has changed
          const allLineItemIds = new Set([
            ...Object.keys(currentEntries),
            ...Object.keys(initialEntries),
          ]);

          for (const lineItemId of allLineItemIds) {
            const currentValue = currentEntries[lineItemId] || 0;
            const initialValue = initialEntries[lineItemId] || 0;
            if (currentValue !== initialValue) {
              return true;
            }
          }
          return false;
        })
        .map(async (date) => {
          const dateKey = formatDateKey(date);
          const entries = wealthData.sections
            .flatMap((section) => section.lineItems)
            .map((lineItem) => ({
              lineItemId: lineItem.id,
              amount: entryValues[dateKey]?.[lineItem.id] || 0,
            }));

          await createOrUpdateWealthEntries({
            date: parseUTCDateKey(dateKey),
            entries: entries.map((entry) => ({
              lineItemId: entry.lineItemId as Id<'wealth_line_items'>,
              amount: entry.amount,
            })),
          });
        });

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        // Update initial values after successful save
        initialEntryValuesRef.current = JSON.parse(JSON.stringify(entryValues));
        hasUserMadeChangeRef.current = false;
        setLastSavedTime(new Date());
      }
      // Don't refetch - this causes infinite loop
      // Dates will be updated from entries on next page load or manual refresh
    } catch (error: any) {
      console.error('Error saving entries:', error);
      toast.error(error.message || 'Failed to save entries');
    } finally {
      setIsSaving(false);
    }
  }, [
    wealthData,
    entryValues,
    dates,
    formatDateKey,
    hasEntryValuesChanged,
    createOrUpdateWealthEntries,
  ]);

  // Debounced auto-save - only save when entryValues actually change (user edits)
  useEffect(() => {
    // Don't save on initial load
    if (isInitialLoadRef.current) {
      return;
    }

    // Don't save if user hasn't made a change
    if (!hasUserMadeChangeRef.current) {
      return;
    }

    // Don't save if no dates or no entry values
    if (dates.length === 0 || Object.keys(entryValues).length === 0) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveAllEntries();
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // Only depend on entryValues - don't include saveAllEntries or dates to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryValues]);

  // Handle add section
  const handleAddSection = useCallback(() => {
    setEditingSection(null);
    setSectionModalOpen(true);
  }, []);

  // Handle edit section
  const handleEditSection = useCallback((section: WealthSection) => {
    setEditingSection(section);
    setSectionModalOpen(true);
  }, []);

  // Handle delete section - open confirmation modal
  const handleDeleteSection = useCallback(
    (section: WealthSection) => {
      // Find the section in wealthData to get line item count
      const sectionData = wealthData?.sections.find((s) => s.id === section.id);
      const lineItemCount = sectionData?.lineItems.length || 0;
      setSectionToDelete({
        id: section.id,
        name: section.name,
        lineItemCount,
      });
      setDeleteSectionModalOpen(true);
    },
    [wealthData]
  );

  // Handle add line item
  const handleAddLineItem = useCallback((sectionId: string) => {
    setSelectedSectionForLineItem(sectionId);
    setEditingLineItem(null);
    setLineItemModalOpen(true);
  }, []);

  // Handle edit line item
  const handleEditLineItem = useCallback(
    (lineItem: WealthLineItem, sectionId: string) => {
      setSelectedSectionForLineItem(sectionId);
      setEditingLineItem({ lineItem, sectionId });
      setLineItemModalOpen(true);
    },
    []
  );

  // Handle delete line item - open confirmation modal
  const handleDeleteLineItem = useCallback((lineItem: WealthLineItem) => {
    setLineItemToDelete({ id: lineItem.id, name: lineItem.name });
    setDeleteLineItemModalOpen(true);
  }, []);

  // Handle open date picker modal (add)
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      const toastId = toast.loading(`Uploading ${file.name}...`);
      try {
        const result = await importWealthCsv(
          {
            getSections: () =>
              convex.query(api.wealth.getWealthSectionsByUserId, {}),
            createSection: createWealthSection,
            createLineItem: createWealthLineItem,
            createEntries: createOrUpdateWealthEntries,
          },
          await file.text()
        );

        toast.success(
          `Imported ${result.entries} values across ${result.dates} dates`,
          { id: toastId }
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Upload failed', {
          id: toastId,
        });
      }
    },
    [
      convex,
      createWealthSection,
      createWealthLineItem,
      createOrUpdateWealthEntries,
    ]
  );

  const handleAddDate = useCallback((): void => {
    setEditingDate(null);
    setDatePickerModalOpen(true);
  }, []);

  // Handle edit date: open modal in edit scope
  const handleEditDate = useCallback((date: Date): void => {
    setEditingDate(date);
    setDatePickerModalOpen(true);
  }, []);

  // Handle date selected from modal (add or edit). Store as UTC midnight (constant, no timezone conversion).
  const handleDateSelected = useCallback(
    async (selectedDate: Date): Promise<void> => {
      const y = selectedDate.getFullYear();
      const m = selectedDate.getMonth();
      const d = selectedDate.getDate();
      const newDateUTC = new Date(Date.UTC(y, m, d));
      const newDateKey = formatDateKey(newDateUTC);

      if (editingDate) {
        // Edit scope: update all entries from old date to new date
        const oldDateKey = formatDateKey(editingDate);
        if (oldDateKey === newDateKey) {
          setEditingDate(null);
          setDatePickerModalOpen(false);
          return;
        }
        const dateExists = dates.some(
          (d) =>
            formatDateKey(d) === newDateKey && formatDateKey(d) !== oldDateKey
        );
        if (dateExists) {
          toast.error('This date already exists');
          return;
        }
        try {
          await updateWealthEntriesDate({
            oldDateTimestamp: parseUTCDateKey(oldDateKey),
            newDateTimestamp: parseUTCDateKey(newDateKey),
          });
          setDates((prev) =>
            prev
              .map((d) => (formatDateKey(d) === oldDateKey ? newDateUTC : d))
              .sort((a, b) => b.getTime() - a.getTime())
          );
          setEntryValues((prev) => {
            const next = { ...prev };
            if (next[oldDateKey]) {
              next[newDateKey] = next[oldDateKey];
              delete next[oldDateKey];
            }
            return next;
          });
          const nextInitial = { ...initialEntryValuesRef.current };
          if (nextInitial[oldDateKey]) {
            nextInitial[newDateKey] = nextInitial[oldDateKey];
            delete nextInitial[oldDateKey];
          }
          initialEntryValuesRef.current = nextInitial;
          setEditingDate(null);
          setDatePickerModalOpen(false);
          toast.success('Date updated');
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Failed to update date');
        }
        return;
      }

      // Add scope: check if date already exists and add to state
      const dateExists = dates.some((d) => formatDateKey(d) === newDateKey);
      if (dateExists) {
        toast.error('This date already exists');
        return;
      }
      setDates((prev) => {
        const updated = [...prev, newDateUTC].sort(
          (a, b) => b.getTime() - a.getTime()
        );
        return updated;
      });
      setDatePickerModalOpen(false);
    },
    [dates, formatDateKey, editingDate, updateWealthEntriesDate]
  );

  // Calculate section totals
  const getSectionTotal = useCallback(
    (sectionId: string, date: Date) => {
      if (!wealthData) return 0;

      const section = wealthData.sections.find((s) => s.id === sectionId);
      if (!section) return 0;

      const dateKey = formatDateKey(date);
      return section.lineItems.reduce((sum, lineItem) => {
        return sum + (entryValues[dateKey]?.[lineItem.id] || 0);
      }, 0);
    },
    [wealthData, entryValues, formatDateKey]
  );

  // Calculate section change from previous entry
  // Since dates are sorted latest first, previous entry is the next index (earlier date)
  const getSectionChange = useCallback(
    (sectionId: string, date: Date, dateIndex: number) => {
      // If this is the last (earliest) date, no previous entry to compare
      if (dateIndex === dates.length - 1) return 0;
      const currentTotal = getSectionTotal(sectionId, date);
      const previousDate = dates[dateIndex + 1]; // Next date in array is earlier
      const previousTotal = getSectionTotal(sectionId, previousDate);
      return currentTotal - previousTotal;
    },
    [dates, getSectionTotal]
  );

  // Calculate total wealth (sum of all sections considering operation)
  const getTotalWealth = useCallback(
    (date: Date) => {
      if (!wealthData) return 0;

      const dateKey = formatDateKey(date);
      return wealthData.sections.reduce((total, section) => {
        const sectionTotal = section.lineItems.reduce((sum, lineItem) => {
          return sum + (entryValues[dateKey]?.[lineItem.id] || 0);
        }, 0);

        // If operation is subtract, reduce from total; otherwise add
        if (section.operation === 'subtract') {
          return total - sectionTotal;
        }
        return total + sectionTotal;
      }, 0);
    },
    [wealthData, entryValues, formatDateKey]
  );

  // Calculate total wealth change from previous entry
  const getTotalWealthChange = useCallback(
    (date: Date, dateIndex: number) => {
      // If this is the last (earliest) date, no previous entry to compare
      if (dateIndex === dates.length - 1) return 0;
      const currentTotal = getTotalWealth(date);
      const previousDate = dates[dateIndex + 1]; // Next date in array is earlier
      const previousTotal = getTotalWealth(previousDate);
      return currentTotal - previousTotal;
    },
    [dates, getTotalWealth]
  );

  // Get entry updated timestamp
  const getEntryUpdatedAt = useCallback(
    (lineItemId: string, date: Date) => {
      if (!wealthData) return null;

      const dateKey = formatDateKey(date);
      const entry = wealthData.entries.find(
        (e) =>
          e.lineItemId === lineItemId &&
          formatDateKey(new Date(e.date)) === dateKey
      );
      return entry ? entry.updatedAt : null;
    },
    [wealthData, formatDateKey]
  );

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Expand all sections
  const expandAllSections = useCallback(() => {
    if (!wealthData) return;
    const allSectionIds = new Set(wealthData.sections.map((s) => s.id));
    setExpandedSections(allSectionIds);
  }, [wealthData]);

  // Collapse all sections
  const collapseAllSections = useCallback(() => {
    setExpandedSections(new Set());
  }, []);

  // Default state is collapsed (empty Set), so no initialization needed

  // Drag and drop handlers for sections
  const handleSectionDragStart = useCallback(
    (e: React.DragEvent, sectionId: string) => {
      setDraggedSectionId(sectionId);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleSectionDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSectionDragEnd = useCallback(() => {
    setDraggedSectionId(null);
  }, []);

  const handleSectionDrop = useCallback(
    async (e: React.DragEvent, targetSectionId: string) => {
      e.preventDefault();
      if (
        !draggedSectionId ||
        draggedSectionId === targetSectionId ||
        !wealthData
      ) {
        setDraggedSectionId(null);
        return;
      }

      const draggedIndex = wealthData.sections.findIndex(
        (s) => s.id === draggedSectionId
      );
      const targetIndex = wealthData.sections.findIndex(
        (s) => s.id === targetSectionId
      );

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedSectionId(null);
        return;
      }

      const newSections = [...wealthData.sections];
      const [draggedSection] = newSections.splice(draggedIndex, 1);
      newSections.splice(targetIndex, 0, draggedSection);

      // Update order values
      const updatedSections = newSections.map((section, index) => ({
        ...section,
        order: index,
      }));

      setWealthData({ ...wealthData, sections: updatedSections });
      setIsReordering(true);

      // Save order
      try {
        const updates = updatedSections.map((section, index) => ({
          id: section.id,
          order: index,
        }));

        await updateWealthSectionsOrder({
          updates: updates.map((update: { id: string; order: number }) => ({
            id: update.id as Id<'wealth_sections'>,
            order: update.order,
          })),
        });
        toast.success('Sections reordered successfully');
      } catch (error: any) {
        console.error('Error saving section order:', error);
        toast.error(error.message || 'Failed to save order');
        // The live query is the source of truth; it re-renders on its own.
      } finally {
        setIsReordering(false);
        setDraggedSectionId(null);
      }
    },
    [draggedSectionId, wealthData, updateWealthSectionsOrder]
  );

  // Drag and drop handlers for line items
  const handleLineItemDragStart = useCallback(
    (e: React.DragEvent, lineItemId: string) => {
      setDraggedLineItemId(lineItemId);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleLineItemDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleLineItemDragEnd = useCallback(() => {
    setDraggedLineItemId(null);
  }, []);

  const handleLineItemDrop = useCallback(
    async (e: React.DragEvent, targetLineItemId: string, sectionId: string) => {
      e.preventDefault();
      if (
        !draggedLineItemId ||
        draggedLineItemId === targetLineItemId ||
        !wealthData
      ) {
        setDraggedLineItemId(null);
        return;
      }

      const section = wealthData.sections.find((s) => s.id === sectionId);
      if (!section) {
        setDraggedLineItemId(null);
        return;
      }

      const draggedIndex = section.lineItems.findIndex(
        (li) => li.id === draggedLineItemId
      );
      const targetIndex = section.lineItems.findIndex(
        (li) => li.id === targetLineItemId
      );

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedLineItemId(null);
        return;
      }

      const newLineItems = [...section.lineItems];
      const [draggedLineItem] = newLineItems.splice(draggedIndex, 1);
      newLineItems.splice(targetIndex, 0, draggedLineItem);

      // Update order values
      const updatedLineItems = newLineItems.map((lineItem, index) => ({
        ...lineItem,
        order: index,
      }));

      const updatedSections = wealthData.sections.map((s) =>
        s.id === sectionId ? { ...s, lineItems: updatedLineItems } : s
      );

      setWealthData({ ...wealthData, sections: updatedSections });
      setIsReordering(true);

      // Save order
      try {
        const updates = updatedLineItems.map((lineItem, index) => ({
          id: lineItem.id,
          order: index,
        }));

        await updateWealthLineItemsOrder({
          updates: updates.map((update: { id: string; order: number }) => ({
            id: update.id as Id<'wealth_line_items'>,
            order: update.order,
          })),
        });

        toast.success('Line items reordered successfully');
      } catch (error: any) {
        console.error('Error saving line item order:', error);
        toast.error(error.message || 'Failed to save order');
        // The live query is the source of truth; it re-renders on its own.
      } finally {
        setIsReordering(false);
        setDraggedLineItemId(null);
      }
    },
    [draggedLineItemId, wealthData, updateWealthLineItemsOrder]
  );

  // Create flattened data structure for column-based layout
  interface TableRow {
    id: string;
    type: 'section' | 'lineItem' | 'total';
    name: string;
    sectionId?: string;
    lineItemId?: string;
    sectionColor?: string;
    operation?: 'add' | 'subtract';
    indent?: boolean;
  }

  const tableRows = useMemo((): TableRow[] => {
    if (!wealthData) return [];

    const rows: TableRow[] = [];
    const query = searchQuery.toLowerCase().trim();

    // Add total row at the top
    rows.push({
      id: 'total',
      type: 'total',
      name: 'Total Wealth',
    });

    // Add sections and line items
    wealthData.sections.forEach((section) => {
      const sectionMatches =
        !query || section.name.toLowerCase().includes(query);
      const matchingLineItems = section.lineItems.filter(
        (li) => !query || li.name.toLowerCase().includes(query)
      );

      // If section or any line items match, include them
      if (sectionMatches || matchingLineItems.length > 0) {
        // Add section row
        rows.push({
          id: section.id,
          type: 'section',
          name: section.name,
          sectionId: section.id,
          sectionColor: section.color,
          operation: section.operation,
        });

        // Add line items (all if section matches, filtered otherwise)
        const lineItemsToShow = sectionMatches
          ? section.lineItems
          : matchingLineItems;
        lineItemsToShow.forEach((lineItem) => {
          rows.push({
            id: lineItem.id,
            type: 'lineItem',
            name: lineItem.name,
            sectionId: section.id,
            lineItemId: lineItem.id,
            indent: true,
          });
        });
      }
    });

    return rows;
  }, [wealthData, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <Spinner />
        </div>
      </div>
    );
  }

  if (!isDesktop) {
    return <NotReadyForMobile />;
  }

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wealth</h1>
          <h2 className="text-sm text-muted-foreground">
            Track and manage your wealth across different accounts and
            investments
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              <span>Saving data...</span>
            </div>
          ) : lastSavedTime ? (
            <div className="text-sm text-muted-foreground">
              Last saved:{' '}
              {lastSavedTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                {DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label}
                <IconChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DATE_RANGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setDateRange(option.value)}
                  className="flex items-center gap-2"
                >
                  <IconCheck
                    size={16}
                    className={
                      option.value === dateRange ? 'opacity-100' : 'opacity-0'
                    }
                  />
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                Actions
                <IconChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleAddDate}
                className="flex items-center gap-2"
              >
                <IconPlus size={16} />
                <span>Add Date</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleAddSection}
                className="flex items-center gap-2"
              >
                <IconPlus size={16} />
                <span>Add Section</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => csvInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <IconUpload size={16} />
                <span>Upload CSV</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={expandAllSections}
                className="flex items-center gap-2"
              >
                <IconChevronsDown size={16} />
                <span>Expand all sections</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={collapseAllSections}
                className="flex items-center gap-2"
              >
                <IconChevronsUp size={16} />
                <span>Collapse all sections</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
        </div>
      </div>

      {/* Search Box */}
      {/* <div className='mb-4'>
        <div className='relative'>
          <IconSearch
            className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground'
            size={16}
          />
          <Input
            type='text'
            placeholder='Search sections and line items...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
      </div> */}

      <div className="rounded-lg border bg-card overflow-x-auto">
        {/* Header Row */}
        <div className="flex bg-muted/50 w-max min-w-full">
          <div className="min-w-[300px] shrink-0 sticky left-0 z-20  border-r border-gray-400 p-3 rounded-l-lg bg-gray-50">
            {/* Empty header for frozen column */}
          </div>
          <div
            className="flex rounded-r-lg bg-muted/50"
            style={{ minWidth: `${dates.length * 150}px` }}
          >
            {dates.length > 0 ? (
              dates.map((date) => (
                <div
                  key={date.toISOString()}
                  className="group/date w-[200px] shrink-0 p-3 flex flex-col bg-gray-50 items-center justify-center border-r border-border last:border-r-0 relative"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {date.toLocaleDateString('en-US', {
                      timeZone: 'UTC',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 opacity-0 group-hover/date:opacity-100 transition-opacity"
                    onClick={() => handleEditDate(date)}
                    aria-label="Edit date"
                  >
                    <IconEdit size={14} />
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                No dates added. Click &quot;Add Date&quot; to get started.
              </div>
            )}
          </div>
        </div>

        {/* Data Rows */}
        <div className="space-y-2 w-max min-w-full">
          {tableRows.map((row) => {
            if (row.type === 'total') {
              // Total Wealth Row
              return (
                <div key={row.id} className="flex rounded-lg w-max min-w-full">
                  <div className="min-w-[300px] bg-gray-100 shrink-0 sticky left-0 z-10">
                    <div className="font-bold text-base p-2 border-r border-gray-400 rounded-l-lg flex items-center justify-center gap-2">
                      Total Wealth
                    </div>
                  </div>
                  <div
                    className="flex rounded-r-lg "
                    style={{ minWidth: `${dates.length * 150}px` }}
                  >
                    {dates.map((date, dateIndex) => {
                      const totalWealth = getTotalWealth(date);
                      const change = getTotalWealthChange(date, dateIndex);
                      const previousTotal =
                        dateIndex < dates.length - 1
                          ? getTotalWealth(dates[dateIndex + 1])
                          : 0;
                      const percentageChange =
                        previousTotal !== 0
                          ? (change / previousTotal) * 100
                          : 0;
                      return (
                        <div
                          key={date.toISOString()}
                          className="w-[200px] bg-gray-100 shrink-0 flex items-center justify-center gap-2 p-2 border-r border-border last:border-r-0"
                        >
                          <span className="text-base font-bold">
                            {totalWealth.toLocaleString('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          {change !== 0 && (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-transparent"
                                >
                                  {change > 0 ? (
                                    <IconTrendingUp
                                      size={14}
                                      className="text-green-600"
                                    />
                                  ) : (
                                    <IconTrendingDown
                                      size={14}
                                      className="text-red-600"
                                    />
                                  )}
                                </Button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-auto p-2">
                                <div className="text-sm">
                                  <div className="font-medium">
                                    Change from previous
                                  </div>
                                  <div
                                    className={`text-xs font-semibold ${
                                      change >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {change >= 0 ? '+' : ''}
                                    {change.toLocaleString('en-IN', {
                                      style: 'currency',
                                      currency: 'INR',
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    })}
                                    {percentageChange !== 0 && (
                                      <span className="ml-1">
                                        ({percentageChange >= 0 ? '+' : ''}
                                        {percentageChange.toFixed(2)}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            } else if (row.type === 'section') {
              // Section Row
              const section = wealthData?.sections.find(
                (s) => s.id === row.sectionId
              );
              if (!section) return null;

              const sectionBgColor = section.color || '#9E9E9E';
              const isExpanded = expandedSections.has(section.id);
              const isDragging = draggedSectionId === section.id;

              return (
                <div
                  key={row.id}
                  draggable
                  onDragStart={(e) => handleSectionDragStart(e, section.id)}
                  onDragOver={handleSectionDragOver}
                  onDragEnd={handleSectionDragEnd}
                  onDrop={(e) => handleSectionDrop(e, section.id)}
                  className={`group flex rounded-lg cursor-pointer hover:opacity-90 transition-opacity w-max min-w-full ${
                    isDragging ? 'opacity-50' : ''
                  }`}
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="min-w-[300px] shrink-0 sticky left-0 z-10 border-r border-gray-400 pl-2 flex bg-white">
                    <div
                      style={{ backgroundColor: sectionBgColor }}
                      className=" items-center gap-2 rounded-l-lg flex flex-1 px-4"
                    >
                      <div
                        className="cursor-grab active:cursor-grabbing shrink-0"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconGripVertical
                          size={16}
                          className="text-muted-foreground"
                        />
                      </div>
                      <div className="flex items-center justify-center w-6 h-6">
                        {isExpanded ? (
                          <IconChevronDown size={14} />
                        ) : (
                          <IconChevronRight size={14} />
                        )}
                      </div>
                      <span className="font-semibold text-sm flex-1">
                        {section.name}
                      </span>
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditSection(section)}
                          className="h-6 w-6 p-0"
                        >
                          <IconEdit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSection(section)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <IconTrash size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddLineItem(section.id)}
                          className="h-6 w-6 p-0"
                        >
                          <IconPlus size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex rounded-r-lg"
                    style={{
                      minWidth: `${dates.length * 150}px`,
                      backgroundColor: sectionBgColor,
                    }}
                  >
                    {dates.map((date, dateIndex) => {
                      const sectionTotal = getSectionTotal(section.id, date);
                      const change = getSectionChange(
                        section.id,
                        date,
                        dateIndex
                      );
                      const previousTotal =
                        dateIndex < dates.length - 1
                          ? getSectionTotal(section.id, dates[dateIndex + 1])
                          : 0;
                      const percentageChange =
                        previousTotal !== 0
                          ? (change / previousTotal) * 100
                          : 0;
                      return (
                        <div
                          key={date.toISOString()}
                          style={{
                            backgroundColor: sectionBgColor,
                          }}
                          className="w-[200px] shrink-0 flex items-center justify-center gap-2 p-2 border-r border-border last:border-r-0"
                        >
                          <span className="text-base font-semibold">
                            {sectionTotal.toLocaleString('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          {change !== 0 && (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-transparent"
                                >
                                  {change > 0 ? (
                                    <IconTrendingUp
                                      size={14}
                                      className="text-green-600"
                                    />
                                  ) : (
                                    <IconTrendingDown
                                      size={14}
                                      className="text-red-600"
                                    />
                                  )}
                                </Button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-auto p-2">
                                <div className="text-sm">
                                  <div className="font-medium">
                                    Change from previous
                                  </div>
                                  <div
                                    className={`text-xs font-semibold ${
                                      change >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {change >= 0 ? '+' : ''}
                                    {change.toLocaleString('en-IN', {
                                      style: 'currency',
                                      currency: 'INR',
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    })}
                                    {percentageChange !== 0 && (
                                      <span className="ml-1">
                                        ({percentageChange >= 0 ? '+' : ''}
                                        {percentageChange.toFixed(2)}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            } else if (row.type === 'lineItem') {
              // Line Item Row
              const section = wealthData?.sections.find(
                (s) => s.id === row.sectionId
              );
              const isExpanded = expandedSections.has(row.sectionId || '');

              if (!isExpanded || !section) return null;

              const lineItem = section.lineItems.find(
                (li) => li.id === row.lineItemId
              );
              if (!lineItem) return null;

              const isDragging = draggedLineItemId === lineItem.id;

              return (
                <div
                  key={row.id}
                  draggable
                  onDragStart={(e) => handleLineItemDragStart(e, lineItem.id)}
                  onDragOver={handleLineItemDragOver}
                  onDragEnd={handleLineItemDragEnd}
                  onDrop={(e) => handleLineItemDrop(e, lineItem.id, section.id)}
                  className={`group flex rounded-lg w-max min-w-full ${
                    isDragging ? 'opacity-50' : ''
                  }`}
                >
                  <div className="min-w-[300px] shrink-0 sticky left-0 z-10 p-2 px-4 flex items-center gap-2 border-r border-gray-400 bg-white">
                    <div className="flex items-center gap-2 rounded-l-lg pl-10 flex-1">
                      <div
                        className="cursor-grab active:cursor-grabbing shrink-0"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconGripVertical
                          size={16}
                          className="text-muted-foreground"
                        />
                      </div>
                      <span className="text-sm flex-1">{row.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleEditLineItem(lineItem, section.id)
                          }
                          className="h-6 w-6 p-0"
                        >
                          <IconEdit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLineItem(lineItem)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex rounded-r-lg bg-card/50"
                    style={{ minWidth: `${dates.length * 150}px` }}
                  >
                    {dates.map((date) => {
                      const dateKey = formatDateKey(date);
                      const value =
                        entryValues[dateKey]?.[row.lineItemId || ''] || 0;
                      return (
                        <div
                          key={date.toISOString()}
                          className="w-[200px] shrink-0 flex items-center justify-center p-2 border-r border-border last:border-r-0"
                        >
                          <WealthDateCell
                            lineItemId={row.lineItemId || ''}
                            date={date}
                            value={value}
                            updatedAt={getEntryUpdatedAt(
                              row.lineItemId || '',
                              date
                            )}
                            onChange={(newValue: number) =>
                              handleEntryChange(
                                row.lineItemId || '',
                                date,
                                newValue
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return null;
          })}

          {tableRows.length === 1 && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground rounded-lg">
              No sections found. Add a section to get started.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <WealthSectionModal
        open={sectionModalOpen}
        onOpenChange={setSectionModalOpen}
        section={editingSection}
      />

      <WealthLineItemModal
        open={lineItemModalOpen}
        onOpenChange={setLineItemModalOpen}
        lineItem={editingLineItem?.lineItem || null}
        sectionId={
          editingLineItem?.sectionId || selectedSectionForLineItem || ''
        }
      />

      <WealthDatePickerModal
        open={datePickerModalOpen}
        onOpenChange={(open) => {
          setDatePickerModalOpen(open);
          if (!open) setEditingDate(null);
        }}
        onDateSelect={handleDateSelected}
        scope={editingDate ? 'edit' : 'add'}
        initialDate={editingDate}
      />

      <DeleteLineItemModal
        open={deleteLineItemModalOpen}
        onOpenChange={setDeleteLineItemModalOpen}
        lineItem={lineItemToDelete}
      />

      <DeleteSectionModal
        open={deleteSectionModalOpen}
        onOpenChange={setDeleteSectionModalOpen}
        section={sectionToDelete}
      />
    </div>
  );
}
