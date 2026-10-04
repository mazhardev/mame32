'use client';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

/**
 * Small adapter over next/link and next/navigation with the `to` prop style
 * the views were written against, so links read the same everywhere.
 */
type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>;

interface LinkProps extends AnchorProps {
  to: string;
  className?: string;
  children?: ReactNode;
  replace?: boolean;
}

export function Link({ to, replace, ...rest }: LinkProps) {
  return <NextLink href={to} replace={replace} {...rest} />;
}

const trim = (path: string) => (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path);

/** True when `to` is the current page (or, unless `end`, one of its sub-pages). */
export function useIsActive(to: string, end = false): boolean {
  const pathname = trim(usePathname() ?? '/');
  const target = trim(to);
  if (pathname === target) return true;
  return !end && target !== '/' && pathname.startsWith(`${target}/`);
}

interface NavLinkProps extends AnchorProps {
  to: string;
  end?: boolean;
  className?: string | ((state: { isActive: boolean }) => string);
  children?: ReactNode;
}

export function NavLink({ to, end, className, ...rest }: NavLinkProps) {
  const isActive = useIsActive(to, end);
  const cls = typeof className === 'function' ? className({ isActive }) : className;
  return <NextLink href={to} className={cls} aria-current={isActive ? 'page' : undefined} {...rest} />;
}

export function useNavigate() {
  const router = useRouter();
  return (to: string, options?: { replace?: boolean }) => (options?.replace ? router.replace(to) : router.push(to));
}
