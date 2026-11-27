/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  HEADER_LOGO_HEIGHT,
  HEADER_LOGO_WIDTH,
  ORIGINAL_LOGO_ASPECT_RATIO,
  ORIGINAL_LOGO_PIXEL_HEIGHT,
  ORIGINAL_LOGO_PIXEL_WIDTH,
} from '../../components/TechArthaLogo';

const mobileRoot = join(__dirname, '../../..');

describe('Global Header & Official TechArtha Logo standardization', () => {
  it('uses original 724x187 lockup asset aspect ratio with fixed non-shrinking header dimensions', () => {
    expect(ORIGINAL_LOGO_PIXEL_WIDTH).toBe(724);
    expect(ORIGINAL_LOGO_PIXEL_HEIGHT).toBe(187);
    expect(HEADER_LOGO_WIDTH / HEADER_LOGO_HEIGHT).toBeCloseTo(ORIGINAL_LOGO_ASPECT_RATIO, 1);

    const logoSrc = readFileSync(join(mobileRoot, 'src/components/TechArthaLogo.tsx'), 'utf8');
    expect(logoSrc).toContain("assets/logo.png");
    expect(logoSrc).toContain('resizeMode="contain"');
    expect(logoSrc).toContain('aspectRatio: ORIGINAL_LOGO_ASPECT_RATIO');
  });

  it('never renders dynamic route/screen titles underneath or beside the logo in Header', () => {
    const headerSrc = readFileSync(join(mobileRoot, 'src/components/Header.tsx'), 'utf8');
    expect(headerSrc).toContain('<TechArthaLogo size="header" />');
    expect(headerSrc).not.toContain('centerSubtitle');
    expect(headerSrc).not.toContain('{title');
    expect(headerSrc).not.toContain('backBtnPlaceholder');
  });

  it('keeps Welcome screen free of back button while keeping Language & Notification actions intact', () => {
    const welcomeSrc = readFileSync(join(mobileRoot, 'src/screens/WelcomeScreen.tsx'), 'utf8');
    expect(welcomeSrc).toContain('hideBack={true}');
    expect(welcomeSrc).toContain('showSettings={false}');
  });
});
