import { SupportQuerySection, EXACT_ACKNOWLEDGEMENT_MESSAGE } from '../SupportQuerySection';

describe('SupportQuerySection', () => {
  it('is exported as a React component function', () => {
    expect(SupportQuerySection).toBeDefined();
    expect(typeof SupportQuerySection).toBe('function');
  });

  it('exports the exact mandated query acknowledgement message', () => {
    expect(EXACT_ACKNOWLEDGEMENT_MESSAGE).toBe(
      "We've received your query! Our team is looking into it, and we'll update you as soon as we have more information.",
    );
  });
});
