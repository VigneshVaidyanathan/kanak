'use client';

import { CategoriesSection } from '@/components/categories';
import { TransactionRulesSection } from '@/components/transactions/rules/transaction-rules-section';
import { NotReadyForMobile } from '@kanak/components';
import { Tabs, TabsContent, TabsList, TabsTrigger, useDevice } from '@kanak/ui';
import {
  IconBuildingBank,
  IconCategory,
  IconFilter,
  IconUpload,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BankAccountsSection } from './bank-accounts-section';
import { TransactionUploadsSection } from '@/components/transactions/upload-csv/transaction-uploads-section';

export default function SettingsPage() {
  const { isDesktop } = useDevice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('categories');

  // Initialize tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (
      tabParam &&
      [
        'categories',
        'bank-accounts',
        'transaction-rules',
        'transaction-uploads',
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/settings?tab=${value}`);
  };

  if (!isDesktop) {
    return <NotReadyForMobile />;
  }

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <h2 className="text-sm text-muted-foreground">
            Manage your application settings
          </h2>
        </div>
      </div>

      <div className="flex gap-6">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          orientation="vertical"
          className="flex flex-row gap-6 w-full"
        >
          {/* Left sidebar with vertical tabs */}
          <div className="w-64 shrink-0">
            <TabsList className="flex flex-col h-auto w-full bg-muted p-2 gap-1">
              <TabsTrigger
                value="categories"
                className="cursor-pointer w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"
              >
                <IconCategory className="shrink-0 size-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Categories</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="bank-accounts"
                className="cursor-pointer w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"
              >
                <IconBuildingBank className="shrink-0 size-4" />
                Bank Accounts
              </TabsTrigger>
              <TabsTrigger
                value="transaction-rules"
                className="cursor-pointer w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"
              >
                <IconFilter className="shrink-0 size-4" />
                Transaction Rules
              </TabsTrigger>
              <TabsTrigger
                value="transaction-uploads"
                className="cursor-pointer w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"
              >
                <IconUpload className="shrink-0 size-4" />
                Transaction uploads
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Right content pane */}
          <div className="flex-1">
            <TabsContent value="categories" className="mt-0">
              <CategoriesSection />
            </TabsContent>
            <TabsContent value="bank-accounts" className="mt-0">
              <BankAccountsSection />
            </TabsContent>
            <TabsContent value="transaction-rules" className="mt-0">
              <TransactionRulesSection />
            </TabsContent>
            <TabsContent value="transaction-uploads" className="mt-0">
              <TransactionUploadsSection />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
