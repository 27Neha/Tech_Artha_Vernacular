import React from 'react';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';

export const SearchIcon = ({ color = '#9CA3AF', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="11" cy="11" r="8"></Circle>
    <Line x1="21" y1="21" x2="16.65" y2="16.65"></Line>
  </Svg>
);

export const CloseIcon = ({ color = '#9CA3AF', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10"></Circle>
    <Line x1="15" y1="9" x2="9" y2="15"></Line>
    <Line x1="9" y1="9" x2="15" y2="15"></Line>
  </Svg>
);

export const ChevronIcon = ({ color = '#3C3985', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="9 18 15 12 9 6"></Polyline>
  </Svg>
);

export const HeadsetIcon = ({ color = '#9CA3AF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 14v-2a8 8 0 0 1 16 0v2"></Path>
    <Path d="M4 14h2.5v5H5a1 1 0 0 1-1-1z"></Path>
    <Path d="M20 14h-2.5v5H19a1 1 0 0 0 1-1z"></Path>
    <Path d="M18.5 19c0 1.7-1.8 3-4.5 3h-1.5"></Path>
  </Svg>
);

export const HomeIcon = ({ color = '#9CA3AF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></Path>
    <Polyline points="9 22 9 12 15 12 15 22"></Polyline>
  </Svg>
);

export const TrendingIcon = ({ color = '#9CA3AF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></Polyline>
    <Polyline points="17 6 23 6 23 12"></Polyline>
  </Svg>
);

export const WalletIcon = ({ color = '#9CA3AF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"></Path>
    <Path d="M17 12h4v5h-4z"></Path>
    <Circle cx="19" cy="14.5" r="0.5" fill={color} stroke="none"></Circle>
  </Svg>
);

export const BookIcon = ({ color = '#9CA3AF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></Path>
    <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></Path>
  </Svg>
);

export const UserIcon = ({ color = '#9CA3AF', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></Path>
    <Circle cx="12" cy="7" r="4"></Circle>
  </Svg>
);

export const DownloadIcon = ({ color = '#102A54', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></Path>
    <Polyline points="7 10 12 15 17 10"></Polyline>
    <Line x1="12" y1="15" x2="12" y2="3"></Line>
  </Svg>
);

export const ShareIcon = ({ color = '#102A54', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="18" cy="5" r="3"></Circle>
    <Circle cx="6" cy="12" r="3"></Circle>
    <Circle cx="18" cy="19" r="3"></Circle>
    <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></Line>
    <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></Line>
  </Svg>
);

export const FileIcon = ({ color = '#102A54', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></Path>
    <Polyline points="13 2 13 9 20 9"></Polyline>
  </Svg>
);
