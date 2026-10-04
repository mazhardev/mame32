import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Components use Next.js navigation hooks; tests render them without the
// Next.js app router, so provide a quiet stand-in.
vi.mock('next/navigation', () => {
  const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() };
  return {
    useRouter: () => router,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    notFound: () => {
      throw new Error('notFound');
    },
  };
});

// jsdom does not implement these browser APIs that the game engine touches.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Pointer capture is used by drag controls; jsdom does not implement it.
if (typeof Element !== 'undefined' && !('setPointerCapture' in Element.prototype)) {
  Object.assign(Element.prototype, {
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture: () => false,
  });
}
