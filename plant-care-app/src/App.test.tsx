import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';

import App from './App';

it('renders the care promise and five primary destinations', () => {
  render(
    <MemoryRouter initialEntries={['/today']}>
      <App />
    </MemoryRouter>,
  );

  expect(screen.getByText(/know what each plant needs today/i)).toBeVisible();
  for (const label of ['Today', 'My Garden', 'Add', 'Journal', 'Profile']) {
    expect(screen.getByRole('link', { name: label })).toBeVisible();
  }
});
