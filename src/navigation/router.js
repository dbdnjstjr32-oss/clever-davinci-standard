/**
 * Granite Route Definitions & Path Mappings
 */
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  PATH: '/path',
  FEED: '/feed',
  MAKER_FEED: '/maker-feed',
  WRITE: '/write',
  STORY_DETAIL: '/story-detail',
  PROFILE: '/profile',
  SETTINGS: '/settings',
};

export const ROUTE_NAME_MAP = {
  '/': 'Home',
  '/auth': 'Auth',
  '/path': 'Path',
  '/feed': 'Feed',
  '/maker-feed': 'MakerFeed',
  '/write': 'Write',
  '/story-detail': 'StoryDetail',
  '/profile': 'Profile',
  '/settings': 'Settings',
};

export const REVERSE_ROUTE_MAP = {
  Home: '/',
  Auth: '/auth',
  Path: '/path',
  Feed: '/feed',
  MakerFeed: '/maker-feed',
  Write: '/write',
  StoryDetail: '/story-detail',
  Profile: '/profile',
  Settings: '/settings',
};

/**
 * Screen Animation Types
 */
export const ANIMATION_TYPES = {
  SLIDE_RIGHT: 'slide_right',
  MODAL_BOTTOM: 'modal_bottom',
  FADE_SCALE: 'fade_scale',
};

/**
 * Returns custom transition animation preset based on route path
 */
export function getRouteAnimationPreset(path) {
  switch (path) {
    case ROUTES.WRITE:
    case ROUTES.AUTH:
      return ANIMATION_TYPES.MODAL_BOTTOM;
    case ROUTES.PATH:
    case ROUTES.PROFILE:
      return ANIMATION_TYPES.FADE_SCALE;
    case ROUTES.STORY_DETAIL:
    case ROUTES.SETTINGS:
    case ROUTES.FEED:
    case ROUTES.MAKER_FEED:
    default:
      return ANIMATION_TYPES.SLIDE_RIGHT;
  }
}

/**
 * Resolves path name to React Navigation Screen name
 */
export function resolveRouteName(pathOrName) {
  if (ROUTE_NAME_MAP[pathOrName]) {
    return ROUTE_NAME_MAP[pathOrName];
  }
  return pathOrName;
}

/**
 * Resolves Screen name to path string
 */
export function resolvePathName(screenName) {
  if (REVERSE_ROUTE_MAP[screenName]) {
    return REVERSE_ROUTE_MAP[screenName];
  }
  return `/${screenName.toLowerCase()}`;
}
