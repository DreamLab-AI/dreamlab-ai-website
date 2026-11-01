import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Diagram } from '../Diagram';

describe('Diagram', () => {
  it('mounts a Pele SVG for a valid source', async () => {
    const { container } = render(<Diagram source={'flowchart LR\n  A[Plan] --> B[Ship]'} />);
    await waitFor(() => expect(container.querySelector('.dl-diagram svg')).not.toBeNull());
    expect(container.textContent).toContain('Plan');
  });

  it('gives two diagrams on one page different id prefixes', async () => {
    const { container } = render(
      <>
        <Diagram source={'flowchart LR\n  A --> B'} />
        <Diagram source={'flowchart LR\n  C --> D'} />
      </>,
    );
    await waitFor(() => expect(container.querySelectorAll('.dl-diagram svg')).toHaveLength(2));
    const ids = [...container.querySelectorAll('.dl-diagram svg [id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows an error as text, never as markup, for an invalid source', async () => {
    const { container } = render(<Diagram source={'flowchart LR\n  A -->'} />);
    await waitFor(() => expect(container.querySelector('.dl-diagram')?.textContent?.length).toBeGreaterThan(0));
    expect(container.querySelector('.dl-diagram script')).toBeNull();
  });
});
