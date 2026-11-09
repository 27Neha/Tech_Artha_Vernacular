const fs = require('fs');
const path = require('path');

// 1. UPDATE Icons.tsx
const iconsPath = path.resolve('apps/mobile/src/components/Icons.tsx');
let iconsContent = fs.readFileSync(iconsPath, 'utf8');
const isIconsCRLF = iconsContent.includes('\r\n');
iconsContent = iconsContent.replace(/\r\n/g, '\n');

if (!iconsContent.includes('CompassIcon')) {
  iconsContent += `
export const CompassIcon = ({ color = '#9CA3AF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </Svg>
);

export const TargetIcon = ({ color = '#9CA3AF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Circle cx="12" cy="12" r="6" />
    <Circle cx="12" cy="12" r="2" />
  </Svg>
);
`;
  if (isIconsCRLF) iconsContent = iconsContent.replace(/\n/g, '\r\n');
  fs.writeFileSync(iconsPath, iconsContent, 'utf8');
  console.log('Icons.tsx updated with CompassIcon and TargetIcon');
}

// 2. UPDATE Header.tsx
const headerPath = path.resolve('apps/mobile/src/components/Header.tsx');
let headerContent = fs.readFileSync(headerPath, 'utf8');
const isHeaderCRLF = headerContent.includes('\r\n');
headerContent = headerContent.replace(/\r\n/g, '\n');

headerContent = headerContent.replace(
  `interface HeaderProps {
  title?: string;
  back?: Screen | boolean;
  onBack?: ((screen?: Screen) => void) | boolean;
  showSettings?: boolean;
  showBack?: boolean;
}`,
  `export interface HeaderProps {
  title?: string;
  back?: Screen | boolean;
  onBack?: ((screen?: Screen) => void) | boolean;
  showSettings?: boolean;
  showBack?: boolean;
  hideBack?: boolean;
  showNotifications?: boolean;
  showLanguage?: boolean;
  onSettingsPress?: () => void;
  route?: any;
}`
);

headerContent = headerContent.replace(
  `export const Header = ({ title, back, onBack, showSettings = true, showBack }: HeaderProps) => {`,
  `export const Header = ({ title, back, onBack, showSettings = true, showBack, hideBack = false, showNotifications = true, showLanguage = true, onSettingsPress, route }: HeaderProps) => {`
);

headerContent = headerContent.replace(
  `  const shouldShowBack =
    showBack !== undefined
      ? showBack
      : typeof onBack === 'function' ||
        Boolean(back) ||
        (!isRootScreen && navigation.canGoBack());`,
  `  const shouldShowBack =
    hideBack
      ? false
      : showBack !== undefined
      ? showBack
      : typeof onBack === 'function' ||
        Boolean(back) ||
        (!isRootScreen && navigation.canGoBack());`
);

if (isHeaderCRLF) headerContent = headerContent.replace(/\n/g, '\r\n');
fs.writeFileSync(headerPath, headerContent, 'utf8');
console.log('Header.tsx updated with extended HeaderProps');

// 3. UPDATE App.tsx
const appPath = path.resolve('apps/mobile/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');
const isAppCRLF = appContent.includes('\r\n');
appContent = appContent.replace(/\r\n/g, '\n');

if (!appContent.includes('ArthaVerseScreen')) {
  appContent = appContent.replace(
    "import { HomeScreen } from './src/screens/HomeScreen';",
    "import { HomeScreen } from './src/screens/HomeScreen';\nimport { ArthaVerseScreen } from './src/screens/ArthaVerseScreen';\nimport { GoalsScreen } from './src/screens/GoalsScreen';"
  );
  
  appContent = appContent.replace(
    "import { HomeIcon, TrendingIcon, WalletIcon, BookIcon, UserIcon, HeadsetIcon } from './src/components/Icons';",
    "import { HomeIcon, TrendingIcon, WalletIcon, BookIcon, UserIcon, HeadsetIcon, CompassIcon, TargetIcon } from './src/components/Icons';"
  );

  // Register stack screens in RootNavigator
  appContent = appContent.replace(
    `<Stack.Screen name="MainTabs" component={MainTabs} />`,
    `<Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Explore" component={ArthaVerseScreen} />
      <Stack.Screen name="ArthaVerse" component={ArthaVerseScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="GoalConfiguration" component={GoalSelectionScreen} />`
  );

  if (isAppCRLF) appContent = appContent.replace(/\n/g, '\r\n');
  fs.writeFileSync(appPath, appContent, 'utf8');
  console.log('App.tsx updated with ArthaVerseScreen, GoalsScreen, and routes');
}

// 4. UPDATE services/api/src/app.module.ts
const appModulePath = path.resolve('services/api/src/app.module.ts');
let appModuleContent = fs.readFileSync(appModulePath, 'utf8');
const isAppModuleCRLF = appModuleContent.includes('\r\n');
appModuleContent = appModuleContent.replace(/\r\n/g, '\n');

if (!appModuleContent.includes('MarketModule')) {
  appModuleContent = appModuleContent.replace(
    "import { PostbackModule } from './modules/postback/postback.module';",
    "import { PostbackModule } from './modules/postback/postback.module';\nimport { MarketModule } from './modules/market/market.module';"
  );

  appModuleContent = appModuleContent.replace(
    "PostbackModule,",
    "PostbackModule,\n    MarketModule,"
  );

  if (isAppModuleCRLF) appModuleContent = appModuleContent.replace(/\n/g, '\r\n');
  fs.writeFileSync(appModulePath, appModuleContent, 'utf8');
  console.log('services/api/src/app.module.ts updated with MarketModule');
}
