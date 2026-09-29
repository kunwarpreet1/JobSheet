import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  Polyline,
  Polygon,
  G,
} from 'react-native-svg';

/**
 * Universal Pure SVG Vector Icon Library Component for JobSheetFlow
 * Crisp 24x24 Vector Paths (Feather / Lucide / Tabler Standard)
 */
export default function VectorIcon({
  name,
  color = '#6366F1',
  size = 20,
  strokeWidth = 2,
  style,
}) {
  const normName = (name || '').toLowerCase().trim();

  const renderSvgContent = () => {
    switch (normName) {
      // 1. Navigation & Core
      case 'home':
        return (
          <>
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" />
          </>
        );

      case 'jobsheets':
      case 'clipboard':
      case 'document':
      case 'list':
        return (
          <>
            <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <Line x1="8" y1="11" x2="16" y2="11" />
            <Line x1="8" y1="15" x2="16" y2="15" />
            <Line x1="8" y1="19" x2="12" y2="19" />
          </>
        );

      case 'mytasks':
      case 'task':
      case 'tasks':
        return (
          <>
            <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <Polyline points="9 13 11 15 15 11" />
          </>
        );

      case 'plus':
      case 'add':
      case 'create':
        return (
          <>
            <Line x1="12" y1="5" x2="12" y2="19" />
            <Line x1="5" y1="12" x2="19" y2="12" />
          </>
        );

      case 'plus-circle':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="8" x2="12" y2="16" />
            <Line x1="8" y1="12" x2="16" y2="12" />
          </>
        );

      case 'chart':
      case 'performance':
      case 'analytics':
      case 'bar-chart':
        return (
          <>
            <Line x1="18" y1="20" x2="18" y2="10" />
            <Line x1="12" y1="20" x2="12" y2="4" />
            <Line x1="6" y1="20" x2="6" y2="14" />
            <Line x1="2" y1="20" x2="22" y2="20" />
          </>
        );

      case 'bell':
      case 'notifications':
        return (
          <>
            <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </>
        );

      case 'settings':
      case 'masterdata':
      case 'gear':
        return (
          <>
            <Circle cx="12" cy="12" r="3" />
            <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </>
        );

      case 'user':
      case 'profile':
      case 'employee':
        return (
          <>
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Circle cx="12" cy="7" r="4" />
          </>
        );

      case 'users':
      case 'team':
        return (
          <>
            <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <Circle cx="9" cy="7" r="4" />
            <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        );

      case 'lock':
      case 'admin':
        return (
          <>
            <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </>
        );

      case 'shield':
        return (
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        );

      case 'crown':
        return (
          <Path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" fill={color} stroke="none" />
        );

      case 'check':
      case 'done':
        return (
          <Polyline points="20 6 9 17 4 12" />
        );

      case 'check-circle':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Polyline points="9 12 11 14 15 10" />
          </>
        );

      case 'clock':
      case 'time':
      case 'history':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Polyline points="12 6 12 12 16 14" />
          </>
        );

      case 'alert':
      case 'warning':
      case 'overdue':
        return (
          <>
            <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <Line x1="12" y1="9" x2="12" y2="13" />
            <Line x1="12" y1="17" x2="12.01" y2="17" />
          </>
        );

      case 'trash':
      case 'delete':
        return (
          <>
            <Polyline points="3 6 5 6 21 6" />
            <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <Line x1="10" y1="11" x2="10" y2="17" />
            <Line x1="14" y1="11" x2="14" y2="17" />
          </>
        );

      case 'edit':
      case 'pencil':
        return (
          <>
            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </>
        );

      case 'camera':
      case 'photo':
        return (
          <>
            <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <Circle cx="12" cy="13" r="4" />
          </>
        );

      case 'whatsapp':
      case 'chat':
      case 'message':
        return (
          <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        );

      case 'search':
        return (
          <>
            <Circle cx="11" cy="11" r="8" />
            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
          </>
        );

      case 'filter':
        return (
          <Polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        );

      case 'sparkles':
      case 'zap':
      case 'flash':
        return (
          <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        );

      case 'logout':
      case 'signout':
        return (
          <>
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <Polyline points="16 17 21 12 16 7" />
            <Line x1="21" y1="12" x2="9" y2="12" />
          </>
        );

      case 'login':
      case 'signin':
      case 'log-in':
        return (
          <>
            <Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <Polyline points="10 17 15 12 10 7" />
            <Line x1="15" y1="12" x2="3" y2="12" />
          </>
        );

      case 'arrow-right':
        return (
          <>
            <Line x1="5" y1="12" x2="19" y2="12" />
            <Polyline points="12 5 19 12 12 19" />
          </>
        );

      case 'arrow-left':
      case 'back':
        return (
          <>
            <Line x1="19" y1="12" x2="5" y2="12" />
            <Polyline points="12 19 5 12 12 5" />
          </>
        );

      case 'arrow-up':
        return (
          <>
            <Line x1="12" y1="19" x2="12" y2="5" />
            <Polyline points="5 12 12 5 19 12" />
          </>
        );

      case 'arrow-down':
        return (
          <>
            <Line x1="12" y1="5" x2="12" y2="19" />
            <Polyline points="19 12 12 19 5 12" />
          </>
        );

      case 'chevron-right':
        return <Polyline points="9 18 15 12 9 6" />;

      case 'chevron-left':
        return <Polyline points="15 18 9 12 15 6" />;

      case 'chevron-down':
        return <Polyline points="6 9 12 15 18 9" />;

      case 'chevron-up':
        return <Polyline points="18 15 12 9 6 15" />;

      case 'calendar':
      case 'date':
        return (
          <>
            <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <Line x1="16" y1="2" x2="16" y2="6" />
            <Line x1="8" y1="2" x2="8" y2="6" />
            <Line x1="3" y1="10" x2="21" y2="10" />
          </>
        );

      case 'eye':
        return (
          <>
            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <Circle cx="12" cy="12" r="3" />
          </>
        );

      case 'upload':
        return (
          <>
            <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <Polyline points="17 8 12 3 7 8" />
            <Line x1="12" y1="3" x2="12" y2="15" />
          </>
        );

      case 'download':
        return (
          <>
            <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <Polyline points="7 10 12 15 17 10" />
            <Line x1="12" y1="15" x2="12" y2="3" />
          </>
        );

      case 'refresh':
      case 'sync':
        return (
          <>
            <Polyline points="23 4 23 10 17 10" />
            <Polyline points="1 20 1 14 7 14" />
            <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </>
        );

      case 'phone':
        return (
          <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        );

      case 'mail':
      case 'email':
        return (
          <>
            <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <Polyline points="22,6 12,13 2,6" />
          </>
        );

      case 'info':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="16" x2="12" y2="12" />
            <Line x1="12" y1="8" x2="12.01" y2="8" />
          </>
        );

      case 'close':
      case 'x':
        return (
          <>
            <Line x1="18" y1="6" x2="6" y2="18" />
            <Line x1="6" y1="6" x2="18" y2="18" />
          </>
        );

      // 2. Manufacturing & Stage-Specific Vectors
      case 'carpentry':
      case 'tools':
      case 'hammer':
        return (
          <>
            <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </>
        );

      case 'qc':
      case 'quality':
      case 'award':
        return (
          <>
            <Circle cx="12" cy="8" r="7" />
            <Polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            <Polyline points="9 8 11 10 15 6" />
          </>
        );

      case 'cushion':
      case 'sofa':
      case 'layers':
        return (
          <>
            <Path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
            <Path d="M2 13a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5z" />
            <Line x1="6" y1="20" x2="6" y2="22" />
            <Line x1="18" y1="20" x2="18" y2="22" />
            <Line x1="12" y1="11" x2="12" y2="18" />
          </>
        );

      case 'fabric':
      case 'scissors':
        return (
          <>
            <Circle cx="6" cy="6" r="3" />
            <Circle cx="6" cy="18" r="3" />
            <Line x1="20" y1="4" x2="8.12" y2="15.88" />
            <Line x1="14.47" y1="14.48" x2="20" y2="20" />
            <Line x1="8.12" y1="8.12" x2="12" y2="12" />
          </>
        );

      case 'fitting':
      case 'wrench':
        return (
          <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        );

      case 'packing':
      case 'package':
      case 'box':
        return (
          <>
            <Line x1="16.5" y1="9.4" x2="7.55" y2="4.21" />
            <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <Line x1="12" y1="22.08" x2="12" y2="12" />
          </>
        );

      case 'delivery':
      case 'truck':
        return (
          <>
            <Rect x="1" y="3" width="15" height="13" />
            <Polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <Circle cx="5.5" cy="18.5" r="2.5" />
            <Circle cx="18.5" cy="18.5" r="2.5" />
          </>
        );

      case 'star':
        return (
          <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        );

      case 'tag':
      case 'price':
        return (
          <>
            <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <Line x1="7" y1="7" x2="7.01" y2="7" />
          </>
        );

      default:
        return (
          <Circle cx="12" cy="12" r="4" fill={color} />
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <G>{renderSvgContent()}</G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
