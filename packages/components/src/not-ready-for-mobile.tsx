'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kanak/ui';

export function NotReadyForMobile(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Not Available on Mobile/Tablet</CardTitle>
          <CardDescription>
            This page is currently only available on desktop devices. Please
            access it from a desktop or laptop computer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We are working on making this feature available on mobile and tablet
            devices. Thank you for your patience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
