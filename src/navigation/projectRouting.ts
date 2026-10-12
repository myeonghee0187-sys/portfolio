export type HomeDestination = {
  section: 'hero' | 'faces' | 'contact' | 'saved'
  faceId?: string
  scrollY?: number
}

export type PortfolioRoute = {
  page: 'home' | 'tchaikim'
  key: string
  destination: HomeDestination | null
  scrollY: number
}

export const TCHAIKIM_PATH = '/projects/tchaikim'

export function routeFromUrl(url: URL, key: string): PortfolioRoute | null {
  if (url.pathname.replace(/\/$/, '') === TCHAIKIM_PATH) {
    return { page: 'tchaikim', key, destination: null, scrollY: 0 }
  }
  if (url.pathname !== '/') return null
  const section = url.hash.slice(1)
  const destination: HomeDestination | null = section === 'faces'
    ? { section, faceId: url.searchParams.get('face') ?? 'tchaikim' }
    : section === 'contact' || section === 'hero' ? { section } : null
  return { page: 'home', key, destination, scrollY: 0 }
}

export function routeForHistory(url: URL, value: unknown, key: string): PortfolioRoute | null {
  const route = routeFromUrl(url, key)
  if (!route || !value || typeof value !== 'object') return route
  const saved = value as Partial<PortfolioRoute>
  if (saved.page !== route.page) return route
  route.key = typeof saved.key === 'string' ? saved.key : key
  route.scrollY = typeof saved.scrollY === 'number' && Number.isFinite(saved.scrollY) ? Math.max(0, saved.scrollY) : 0
  if (route.page === 'home') {
    route.destination = saved.destination?.section === 'faces'
      ? { section: 'faces', faceId: saved.destination.faceId ?? 'tchaikim' }
      : { section: 'saved', scrollY: route.scrollY }
  }
  return route
}
