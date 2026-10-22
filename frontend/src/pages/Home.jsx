import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Laptop,
  Briefcase,
  CreditCard,
  BookOpen,
  Shirt,
  Key,
  Watch,
  FolderOpen,
} from 'lucide-react';
import { config, CATEGORIES } from '../config';
import { getStats, getItems } from '../services/api';
import { ItemCard } from '../components/ItemCard';
import { ItemCardSkeleton } from '../components/LoadingSpinner';

const CATEGORY_ICONS = {
  electronics: Laptop,
  bags: Briefcase,
  id_cards: CreditCard,
  books: BookOpen,
  clothing: Shirt,
  keys: Key,
  accessories: Watch,
  other: HelpCircle,
};

export function Home() {
  const [stats, setStats] = useState({
    totalLost: 0,
    totalFound: 0,
    totalRecovered: 0,
    activeReports: 0,
  });
  const [recentItems, setRecentItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      setIsLoading(true);
      setApiError(null);

      try {
        const [statsRes, itemsRes] = await Promise.allSettled([
          getStats(),
          getItems({ limit: 6, status: 'all' }),
        ]);

        if (isMounted) {
          if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
            setStats(statsRes.value.stats);
          } else {
            console.warn('Stats API unavailable:', statsRes.reason);
          }

          if (itemsRes.status === 'fulfilled' && itemsRes.value?.items) {
            setRecentItems(itemsRes.value.items);
          } else {
            console.warn('Items API unavailable:', itemsRes.reason);
            setApiError('Notice: Backend API is currently starting up or offline. Recent reports will appear once online.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setApiError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/items?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/items');
    }
  };

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 pt-12 pb-16 sm:pb-24 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Campus Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            Official {config.campusName} Lost & Found
          </div>

          {/* Heading & Tagline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            {config.tagline}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Reconnecting campus students and staff with their missing belongings. Report in seconds without mandatory logins, protect your contact privacy, and generate instant QR posters.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 max-w-2xl mx-auto flex items-center bg-white rounded-2xl shadow-premium border border-slate-200/80 p-2 transition focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent"
          >
            <div className="pl-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              id="hero-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item name (e.g. calculator, keys, blue hoodie, student id)..."
              className="w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              className="btn-primary text-xs sm:text-sm py-2.5 px-5 shrink-0"
            >
              Search
            </button>
          </form>

          {/* Call to Actions (Lost vs Found) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/report/lost"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm hover:shadow active:scale-95 transition"
            >
              <PlusCircle className="w-5 h-5" />
              I Lost Something
            </Link>

            <Link
              to="/report/found"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow active:scale-95 transition"
            >
              <PlusCircle className="w-5 h-5" />
              I Found Something
            </Link>

            <Link
              to="/items"
              className="btn-secondary px-5 py-3 text-sm"
            >
              Browse All Listings
            </Link>
          </div>

          {/* Real Backend Statistics Bar */}
          <div className="mt-14 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 shadow-soft">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Lost Belongings
              </p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">
                {stats.totalLost}
              </p>
              <p className="mt-1 text-xs text-slate-500">Reports filed by students</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 shadow-soft">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Found Belongings
              </p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">
                {stats.totalFound}
              </p>
              <p className="mt-1 text-xs text-slate-500">Safely waiting for owners</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 shadow-soft">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                Recovered / Returned
              </p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">
                {stats.totalRecovered}
              </p>
              <p className="mt-1 text-xs text-slate-500">Successfully reunited</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Shortcuts Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Search by Category</h2>
            <p className="text-sm text-slate-500 mt-1">
              Quickly filter reports by common campus belongings
            </p>
          </div>
          <Link
            to="/items"
            className="mt-3 sm:mt-0 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>View all categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || HelpCircle;
            return (
              <Link
                key={cat.id}
                to={`/items?category=${cat.id}`}
                className="card-premium p-4 flex flex-col items-center text-center group hover:border-indigo-200 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Reports Feed Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">Recent Campus Reports</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Live updates of items reported lost and found across campus
            </p>
          </div>

          <Link
            to="/items"
            className="mt-3 sm:mt-0 btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <span>See All Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {apiError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 mb-6">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <ItemCardSkeleton key={n} />
            ))}
          </div>
        ) : recentItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentItems.map((item) => (
              <ItemCard key={item.itemId} item={item} />
            ))}
          </div>
        ) : (
          <div className="card-premium p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No active reports found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              There are currently no reported lost or found belongings. Be the first to file a report if you lost or found an item!
            </p>
            <div className="mt-5 flex gap-3">
              <Link to="/report/lost" className="btn-primary text-xs py-2 px-4">
                Report a Lost Item
              </Link>
              <Link to="/report/found" className="btn-secondary text-xs py-2 px-4">
                Report a Found Item
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 overflow-hidden relative">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              How CampusFind Works
            </h2>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              Designed for privacy, speed, and zero friction. No need to register an account before reporting.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30">
                1
              </div>
              <h3 className="text-base font-bold text-white">1. File a Quick Report</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Describe the item, where it was lost or found, and attach an optional photo. Our backend saves it to Amazon DynamoDB and uploads the image to Amazon S3 via presigned URLs.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30">
                2
              </div>
              <h3 className="text-base font-bold text-white">2. Secure Ownership Token</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You receive a cryptographically random 256-bit management link. You can mark the item as returned or delete it anytime without creating a password.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30">
                3
              </div>
              <h3 className="text-base font-bold text-white">3. Reconnect Safely</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Students browse the catalog, view public details, or scan printable QR codes on campus boards. Contact info is protected behind a safety confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
