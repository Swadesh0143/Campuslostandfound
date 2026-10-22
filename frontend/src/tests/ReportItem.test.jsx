import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ReportItem } from '../pages/ReportItem';
import { ToastProvider } from '../components/Toast';

function renderWithProviders(ui) {
  return render(
    <ToastProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </ToastProvider>
  );
}

describe('ReportItem Component', () => {
  it('renders all required form fields for reporting', () => {
    renderWithProviders(<ReportItem defaultType="lost" />);

    expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Detailed Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Campus Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Display Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Protected Contact Method/i)).toBeInTheDocument();
  });

  it('allows toggling between Lost and Found modes', () => {
    renderWithProviders(<ReportItem defaultType="lost" />);

    const foundButton = screen.getByRole('button', { name: /I Found Something/i });
    fireEvent.click(foundButton);

    expect(screen.getByRole('heading', { name: /Report a Found Belonging/i })).toBeInTheDocument();

    const lostButton = screen.getByRole('button', { name: /I Lost Something/i });
    fireEvent.click(lostButton);

    expect(screen.getByRole('heading', { name: /Report a Lost Belonging/i })).toBeInTheDocument();
  });

  it('displays inline validation errors when required fields are empty upon submit', async () => {
    renderWithProviders(<ReportItem defaultType="lost" />);

    const submitButton = screen.getByRole('button', { name: /Submit Lost Report/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/Item name must be at least 3 characters/i)).toBeInTheDocument();
  });
});
