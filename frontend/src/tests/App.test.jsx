import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock global fetch for initial stats and recent items call
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        stats: { totalLost: 5, totalFound: 3, totalRecovered: 2, activeReports: 6 },
        items: [],
      }),
  })
);

describe('CampusFind App Core Integration', () => {
  it('renders homepage branding, tagline, and navigation links', async () => {
    render(<App />);

    // Brand and Tagline
    expect(screen.getAllByText(/CampusFind/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lost something\? Let's find it\./i).length).toBeGreaterThan(0);

    // Call to actions
    expect(screen.getByText(/I Lost Something/i)).toBeInTheDocument();
    expect(screen.getByText(/I Found Something/i)).toBeInTheDocument();

    // Navigation links
    expect(screen.getAllByRole('link', { name: /Browse Reports/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Architecture/i }).length).toBeGreaterThan(0);
  });
});
