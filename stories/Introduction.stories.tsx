import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Getting Started/Introduction',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Welcome to the Kanak App Storybook! This is a collection of reusable UI components.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: '600px', textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ marginBottom: '1rem', color: '#333' }}>
        Kanak App Components
      </h1>
      <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', color: '#666' }}>
        Welcome to the component library for the Kanak application. This
        Storybook contains all the UI components used throughout the
        application, along with their documentation and interactive examples.
      </p>
      <div style={{ display: 'grid', gap: '1rem', textAlign: 'left' }}>
        <div
          style={{
            padding: '1rem',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
            🎨 Design System
          </h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Consistent design tokens, colors, typography, and spacing
          </p>
        </div>
        <div
          style={{
            padding: '1rem',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
            🧩 Reusable Components
          </h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Modular React components built with Tailwind CSS and Radix UI
          </p>
        </div>
        <div
          style={{
            padding: '1rem',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
            📱 Responsive Design
          </h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Components that work seamlessly across all device sizes
          </p>
        </div>
        <div
          style={{
            padding: '1rem',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
            ♿ Accessibility
          </h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Built with accessibility in mind using ARIA standards
          </p>
        </div>
      </div>
    </div>
  ),
};
