import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('CircuitTwin Application Integration Tests', () => {
  it('switches between Smartphone and Laptop platforms and applies shock presets (Blue Pill)', async () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'CircuitTwin' })).toBeInTheDocument();
    expect(screen.getByText('Market Shock Studio')).toBeInTheDocument();

    // Switch to Laptop platform
    fireEvent.click(screen.getByRole('button', { name: /Laptop/i }));
    const laptopTitles = await screen.findAllByText(/16" Pro Workstation Laptop/i);
    expect(laptopTitles.length).toBeGreaterThan(0);

    // Apply Foundry Capacity Crunch preset
    fireEvent.click(screen.getByRole('button', { name: /Foundry Capacity Crunch/i }));
    expect(screen.getAllByText('Extreme').length).toBeGreaterThan(0);
  });

  it('navigates across BOM Matrix, Supply Network, and Risk Taxonomy views (Blue Pill)', () => {
    render(<App />);

    // BOM Matrix
    fireEvent.click(screen.getByRole('button', { name: 'BOM Matrix' }));
    expect(screen.getByText(/Smartphone Bill of Materials Matrix/i)).toBeInTheDocument();

    // Supply Network
    fireEvent.click(screen.getByRole('button', { name: 'Supply Network' }));
    expect(screen.getByText(/Multi-Tier Supply Network Topology/i)).toBeInTheDocument();

    // Risk Taxonomy
    fireEvent.click(screen.getByRole('button', { name: 'Risk Taxonomy' }));
    expect(screen.getByText(/Electronics Supply Chain Risk Taxonomy/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Price Shock & Elasticity Model/i)).toBeInTheDocument();
  });

  it('displays explicit empty state on BOM Matrix invalid search and recovers on Clear Filters (Red Pill)', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'BOM Matrix' }));
    const searchInput = screen.getByLabelText('Search BOM assemblies');

    fireEvent.change(searchInput, { target: { value: 'zzzz-nonexistent-part' } });
    expect(screen.getByText(/No matching hardware assemblies found/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    expect(screen.queryByText(/No matching hardware assemblies found/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/3nm Application Processor \(SoC\)/i).length).toBeGreaterThan(0);
  });
});
