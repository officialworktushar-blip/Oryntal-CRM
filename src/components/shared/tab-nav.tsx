import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: string;
  href: string;
}

export function TabNav({
  items,
  active,
  basePath,
}: {
  items: TabItem[];
  active: string;
  basePath: string;
}) {
  return (
    <div className="scrollbar-thin flex items-center gap-1 overflow-x-auto rounded-lg border bg-white p-1">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={`${basePath}?tab=${item.key}`}
            className={cn(
              'whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand text-white shadow'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}