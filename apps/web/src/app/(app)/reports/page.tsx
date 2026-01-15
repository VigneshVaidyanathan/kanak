'use client';

import { SectionPieChart } from '@/components/reports/section-pie-chart';
import { TotalWealthAreaChart } from '@/components/reports/total-wealth-area-chart';
import { TotalWealthChart } from '@/components/reports/total-wealth-chart';
import { TotalWealthStat } from '@/components/reports/total-wealth-stat';
import { useAuthStore } from '@/store/auth-store';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Spinner,
} from '@kanak/ui';
import { IconChevronDown } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [wealthData, setWealthData] = useState<WealthData | null>(null);

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateKey = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Helper function to parse date string (YYYY-MM-DD) to Date in local timezone
  const parseDateKey = useCallback((dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, []);

  // Fetch wealth data
  const fetchWealthData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/wealth', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: WealthData = await response.json();
        setWealthData(data);
      }
    } catch (error) {
      console.error('Error fetching wealth data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial data fetch
  useEffect(() => {
    const checkAuthAndFetch = () => {
      if (typeof window !== 'undefined') {
        const storedAuth = localStorage.getItem('auth-storage');
        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth);
            if (parsed.state?.token && parsed.state?.user) {
              if (!isAuthenticated) {
                const { setAuth } = useAuthStore.getState();
                setAuth(parsed.state.user, parsed.state.token);
              }
              fetchWealthData();
              return;
            }
          } catch (e) {
            // Invalid stored data
          }
        }
      }

      if (!isAuthenticated && !token) {
        router.push('/auth');
        return;
      }

      if (isAuthenticated || token) {
        fetchWealthData();
      }
    };

    checkAuthAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, router]);

  // Process data for charts
  const processedData = useMemo(() => {
    if (!wealthData || !wealthData.entries || wealthData.entries.length === 0) {
      return {
        dates: [],
        entryValues: {},
        totalWealth: 0,
        change: 0,
        lastUpdated: null,
        areaChartData: [],
        sectionPieData: [],
        lineItemsChartData: [],
        lineItemsSeries: [],
        sectionSeries: [],
        totalWealthAreaChartData: [],
      };
    }

    // Extract unique dates from entries
    const uniqueDates = new Set<string>();
    const values: Record<string, Record<string, number>> = {};

    wealthData.entries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const dateKey = formatDateKey(entryDate);
      uniqueDates.add(dateKey);
      if (!values[dateKey]) {
        values[dateKey] = {};
      }
      values[dateKey][entry.lineItemId] = entry.amount;
    });

    // Convert to Date objects and sort ascending (oldest first for charts)
    const sortedDates = Array.from(uniqueDates)
      .map((dateStr) => parseDateKey(dateStr))
      .sort((a, b) => a.getTime() - b.getTime());

    // Calculate total wealth for each date
    const getTotalWealth = (date: Date) => {
      const dateKey = formatDateKey(date);
      return wealthData.sections.reduce((total, section) => {
        const sectionTotal = section.lineItems.reduce((sum, lineItem) => {
          return sum + (values[dateKey]?.[lineItem.id] || 0);
        }, 0);

        if (section.operation === 'subtract') {
          return total - sectionTotal;
        }
        return total + sectionTotal;
      }, 0);
    };

    // Calculate section total for a date
    const getSectionTotal = (sectionId: string, date: Date) => {
      const section = wealthData.sections.find((s) => s.id === sectionId);
      if (!section) return 0;

      const dateKey = formatDateKey(date);
      return section.lineItems.reduce((sum, lineItem) => {
        return sum + (values[dateKey]?.[lineItem.id] || 0);
      }, 0);
    };

    // Get latest and previous dates
    const latestDate =
      sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    const previousDate =
      sortedDates.length > 1 ? sortedDates[sortedDates.length - 2] : null;

    const currentTotalWealth = latestDate ? getTotalWealth(latestDate) : 0;
    const previousTotalWealth = previousDate ? getTotalWealth(previousDate) : 0;
    const change = currentTotalWealth - previousTotalWealth;

    // Prepare area chart data (section totals over time)
    const areaChartData = sortedDates.map((date) => {
      const dateKey = formatDateKey(date);
      const dataPoint: Record<string, string | number> = {
        date: date.toISOString(),
      };

      wealthData.sections.forEach((section) => {
        dataPoint[section.name] = getSectionTotal(section.id, date);
      });

      return dataPoint;
    });

    // Prepare section pie chart data (latest date only)
    const sectionPieData = latestDate
      ? wealthData.sections.map((section) => {
          const dateKey = formatDateKey(latestDate);
          const lineItems = section.lineItems.map((lineItem) => ({
            name: lineItem.name,
            value: values[dateKey]?.[lineItem.id] || 0,
            color: section.color,
          }));

          return {
            sectionId: section.id,
            sectionName: section.name,
            sectionColor: section.color,
            lineItems,
          };
        })
      : [];

    // Prepare line items chart data
    const lineItemsChartData = sortedDates.map((date) => {
      const dateKey = formatDateKey(date);
      const dataPoint: Record<string, string | number> = {
        date: date.toISOString(),
      };

      wealthData.sections.forEach((section) => {
        section.lineItems.forEach((lineItem) => {
          dataPoint[lineItem.name] = values[dateKey]?.[lineItem.id] || 0;
        });
      });

      return dataPoint;
    });

    // Prepare line items series info
    const lineItemsSeries = wealthData.sections.flatMap((section) =>
      section.lineItems.map((lineItem) => ({
        name: lineItem.name,
        color: section.color || 'var(--color-chart-1)',
        sectionName: section.name,
      }))
    );

    // Define contrasting colors for sections
    const contrastingColors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#F97316', // Orange
    ];

    // Prepare section series info for area chart with contrasting colors
    const sectionSeries = wealthData.sections.map((section, index) => ({
      name: section.name,
      color:
        section.color || contrastingColors[index % contrastingColors.length],
      data: sortedDates.map((date) => getSectionTotal(section.id, date)),
    }));

    // Prepare total wealth area chart data (just total, not broken down)
    const totalWealthAreaChartData = sortedDates.map((date) => ({
      date: date.toISOString(),
      total: getTotalWealth(date),
    }));

    return {
      dates: sortedDates,
      entryValues: values,
      totalWealth: currentTotalWealth,
      change,
      lastUpdated: latestDate,
      areaChartData,
      sectionPieData,
      lineItemsChartData,
      lineItemsSeries,
      sectionSeries,
      totalWealthAreaChartData,
    };
  }, [wealthData, formatDateKey, parseDateKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <h2 className="text-sm text-muted-foreground">
            Visualize and analyze your wealth data through charts and insights
          </h2>
        </div>
        <div className="flex items-center gap-2">
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
              <DropdownMenuItem onClick={fetchWealthData}>
                Refresh Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="w-1/3">
            {/* Total Wealth Stat Card */}
            <TotalWealthStat
              totalWealth={processedData.totalWealth}
              change={processedData.change}
              lastUpdated={processedData.lastUpdated}
            />
          </div>
          <div className="w-2/3">
            <TotalWealthAreaChart
              data={processedData.totalWealthAreaChartData}
            />
          </div>
        </div>

        {/* Total Wealth Area Chart */}
        <div className="">
          <TotalWealthChart
            data={processedData.areaChartData}
            sections={processedData.sectionSeries}
          />
        </div>

        {/* Section Pie Charts */}
        {processedData.sectionPieData.length > 0 && (
          <div className="flex flex-wrap">
            {processedData.sectionPieData.map((sectionData) => (
              <div key={sectionData.sectionId} className="w-1/4 pr-4 mb-4">
                <SectionPieChart
                  sectionName={sectionData.sectionName}
                  sectionColor={sectionData.sectionColor}
                  data={sectionData.lineItems}
                />
              </div>
            ))}
          </div>
        )}

        {/* Line Items Chart */}
        {/* <div className=''>
          <LineItemsChart
            data={processedData.lineItemsChartData}
            lineItems={processedData.lineItemsSeries}
          />
        </div> */}
      </div>
    </div>
  );
}
