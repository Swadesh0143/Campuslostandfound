import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ItemCard } from '../components/ItemCard';

describe('ItemCard Component', () => {
  const mockItem = {
    itemId: 'test-item-123',
    name: 'Scientific Calculator fx-991EX',
    type: 'found',
    category: 'electronics',
    location: 'Engineering Building Room 204',
    eventDate: '2026-10-21',
    description: 'Black calculator left on front desk.',
    status: 'active',
    viewCount: 14,
  };

  it('renders item card with name, location, view count, and found badge', () => {
    render(
      <BrowserRouter>
        <ItemCard item={mockItem} />
      </BrowserRouter>
    );

    expect(screen.getByText('Scientific Calculator fx-991EX')).toBeInTheDocument();
    expect(screen.getByText('Found Item')).toBeInTheDocument();
    expect(screen.getByText(/Engineering Building Room 204/i)).toBeInTheDocument();
    expect(screen.getByText(/14 views/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Details/i })).toHaveAttribute(
      'href',
      '/items/test-item-123'
    );
  });
});
