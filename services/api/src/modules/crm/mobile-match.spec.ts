import { isSameMobile, mobileQueryCandidates, toE164Mobile, toLocalMobile } from './mobile-match';

describe('mobile-match', () => {
  // Real formats observed in the TechArtha Zoho org's imported Contacts.
  const E164 = '+919920422889';
  const BARE = '7738008563';

  describe('toLocalMobile', () => {
    it.each([
      [E164, '9920422889'],
      [BARE, '7738008563'],
      ['919920422889', '9920422889'],
      ['0091 99204 22889', '9920422889'],
      ['09920422889', '9920422889'],
      ['+91 99204-22889', '9920422889'],
    ])('reduces %s to its 10 significant digits', (input, expected) => {
      expect(toLocalMobile(input)).toBe(expected);
    });

    it.each([null, undefined, '', 'not-a-number', '12345'])('rejects %s', (input) => {
      expect(toLocalMobile(input)).toBeNull();
    });
  });

  describe('isSameMobile', () => {
    it('matches the same subscriber across storage formats', () => {
      expect(isSameMobile(E164, '9920422889')).toBe(true);
      expect(isSameMobile('919920422889', E164)).toBe(true);
    });

    it('does not match different subscribers', () => {
      expect(isSameMobile(E164, BARE)).toBe(false);
    });

    it('never matches on unusable input, so a bad value cannot collapse two clients', () => {
      expect(isSameMobile(null, null)).toBe(false);
      expect(isSameMobile('', '')).toBe(false);
      expect(isSameMobile('junk', 'junk')).toBe(false);
    });
  });

  describe('toE164Mobile', () => {
    it('canonicalises to the form the app stores', () => {
      expect(toE164Mobile(BARE)).toBe('+917738008563');
      expect(toE164Mobile(E164)).toBe(E164);
    });
  });

  describe('mobileQueryCandidates', () => {
    it('covers every spelling a COQL lookup has to ask for', () => {
      expect(mobileQueryCandidates(E164)).toEqual([
        '+919920422889',
        '9920422889',
        '919920422889',
        '09920422889',
      ]);
    });

    it('yields digits-only values, keeping COQL interpolation safe', () => {
      for (const candidate of mobileQueryCandidates("+91 99204'22889")) {
        expect(candidate).toMatch(/^\+?\d+$/);
      }
    });

    it('returns nothing for an unusable number', () => {
      expect(mobileQueryCandidates('junk')).toEqual([]);
    });
  });
});
