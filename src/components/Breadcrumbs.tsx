import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
      <Link to="/" className="hover:text-school-primary transition-colors flex items-center gap-1">
        <Home size={12} />
        Dashboard
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;

        return (
          <div key={to} className="flex items-center gap-2">
            <ChevronRight size={10} className="text-slate-300" />
            {last ? (
              <span className="text-slate-600 dark:text-slate-300">{value.replace(/-/g, ' ')}</span>
            ) : (
              <Link to={to} className="hover:text-school-primary transition-colors">
                {value.replace(/-/g, ' ')}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};
