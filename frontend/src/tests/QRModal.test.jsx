import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QRModal } from '../components/QRModal';
import { ToastProvider } from '../components/Toast';

describe('QRModal Component', () => {
  it('renders modal with QR code SVG and privacy safety confirmation', () => {
    const handleClose = vi.fn();

    render(
      <ToastProvider>
        <QRModal
          isOpen={true}
          onClose={handleClose}
          itemId="item-abc-123"
          itemName="Blue Backpack"
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Share Report via QR Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Blue Backpack/i)).toBeInTheDocument();
    expect(screen.getByText(/Encodes only the public item URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download PNG/i })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ToastProvider>
        <QRModal
          isOpen={false}
          onClose={() => {}}
          itemId="item-abc-123"
          itemName="Blue Backpack"
        />
      </ToastProvider>
    );

    expect(screen.queryByText(/Share Report via QR Code/i)).not.toBeInTheDocument();
  });
});
