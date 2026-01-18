'use client';

import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'small-desktop' | 'desktop';

interface DeviceContextValue {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isSmallDesktop: boolean;
  isDesktop: boolean;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

const getDeviceType = (width: number): DeviceType => {
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else if (width < 1280) {
    return 'small-desktop';
  }
  return 'desktop';
};

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window !== 'undefined') {
      return getDeviceType(window.innerWidth);
    }
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = (): void => {
      console.log('handleResize', getDeviceType(window.innerWidth));
      setDeviceType(getDeviceType(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const value: DeviceContextValue = {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isSmallDesktop: deviceType === 'small-desktop',
    isDesktop: deviceType === 'desktop',
  };

  return (
    <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
  );
}

export function useDevice(): DeviceContextValue {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
