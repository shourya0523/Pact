import { Ionicons } from '@expo/vector-icons';

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive?: keyof typeof Ionicons.glyphMap;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    route: '/screens/dashboard/Home',
    icon: 'home-outline',
    iconActive: 'home',
  },
  {
    id: 'stats',
    label: 'Stats',
    route: '/screens/dashboard/HabitViews',
    icon: 'stats-chart-outline',
    iconActive: 'stats-chart',
  },
  {
    id: 'partners',
    label: 'Partners',
    route: '/screens/dashboard/ViewAllPartnerships',
    icon: 'people-outline',
    iconActive: 'people',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    route: '/screens/dashboard/Notifications',
    icon: 'notifications-outline',
    iconActive: 'notifications',
  },
  {
    id: 'profile',
    label: 'Profile',
    route: '/screens/dashboard/profile',
    icon: 'person-outline',
    iconActive: 'person',
  },
];

/**
 * Get the active navigation item based on the current route
 */
export function getActiveNavItem(currentRoute: string): string | null {
  // Normalize routes for comparison
  const normalizedRoute = currentRoute.toLowerCase();
  
  for (const item of NAV_ITEMS) {
    const normalizedItemRoute = item.route.toLowerCase();
    if (normalizedRoute === normalizedItemRoute || normalizedRoute.includes(normalizedItemRoute.split('/').pop() || '')) {
      return item.id;
    }
  }
  
  return null;
}

/**
 * Check if a route matches the current path
 */
export function isRouteActive(route: string, currentPath: string): boolean {
  const normalizedRoute = route.toLowerCase();
  const normalizedPath = currentPath.toLowerCase();
  
  // Exact match
  if (normalizedPath === normalizedRoute) return true;
  
  // Check if current path includes the route's key identifier
  const routeKey = normalizedRoute.split('/').pop() || '';
  return normalizedPath.includes(routeKey);
}

