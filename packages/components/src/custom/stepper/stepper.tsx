'use client';

import { cn } from '@kanak/ui/lib/utils';
import { IconCheck } from '@tabler/icons-react';
import * as React from 'react';

export interface StepperStep {
  icon: React.ReactNode;
  label: string;
  description: string;
}

export interface StepperProps {
  active: number;
  onStepClick?: (step: number) => void;
  steps: StepperStep[];
  completedIcon?: React.ReactNode;
  className?: string;
}

export function Stepper({
  active,
  onStepClick,
  steps,
  completedIcon,
  className,
}: StepperProps) {
  const defaultCompletedIcon = completedIcon || (
    <IconCheck size={16} className="text-black dark:text-white" />
  );

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === active;
          const isCompleted = index < active;
          const isClickable = onStepClick && (isCompleted || isActive);

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isClickable && onStepClick) {
                      onStepClick(index);
                    }
                  }}
                  disabled={!isClickable}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all',
                    isClickable && 'cursor-pointer',
                    !isClickable && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                      isActive &&
                        'border-primary bg-primary text-primary-foreground',
                      isCompleted &&
                        'border-black dark:border-white bg-white dark:bg-black',
                      !isActive &&
                        !isCompleted &&
                        'border-muted-foreground bg-background text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      defaultCompletedIcon
                    ) : (
                      <div className="flex items-center justify-center">
                        {step.icon}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        isActive && 'text-primary',
                        isCompleted && 'text-primary',
                        !isActive && !isCompleted && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                    <span
                      className={cn(
                        'text-xs',
                        isActive && 'text-foreground',
                        isCompleted && 'text-muted-foreground',
                        !isActive && !isCompleted && 'text-muted-foreground'
                      )}
                    >
                      {step.description}
                    </span>
                  </div>
                </button>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
