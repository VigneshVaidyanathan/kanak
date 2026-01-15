// Sentry utilities - will be functional when @sentry/nextjs is installed

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Sentry initialization will be added when @sentry/nextjs is installed
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Sentry.captureException will be added when @sentry/nextjs is installed
  }
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Sentry.captureMessage will be added when @sentry/nextjs is installed
  }
}
