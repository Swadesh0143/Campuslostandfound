import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  RotateCcw,
  PlusCircle,
  FolderOpen,
  ArrowRight,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { getItems } from '../services/api';
import { ItemCard } from '../components/ItemCard';
import { ItemCardSkeleton } from '../components/LoadingSpinner';
import { CATEGORIES } from '../config';

export function BrowseItems() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract query parameters with fallbacks
  const typeParam = searchParams.get('type') || 'all';
  const categoryParam = searchParams.get('category') || 'all';
  const statusParam = searchParams.get('status') || 'active';
  const locationParam = searchParams.get('location') || '';
  const searchParam = searchParams.get('search') || '';

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextToken, setNextToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Local state for search and location inputs
  const [searchInput, setSearchInput] = useState(searchParam);
  const [locationInput, setLocationInput] = useState(locationParam);

  // Sync state if URL changes externally
  useEffect(() => {
    setSearchInput(searchParam);
    setLocationInput(locationParam);
  }, [searchParam, locationParam]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      setNextToken(null);

      try {
        const response = await getItems({
          type: typeParam,
          category: categoryParam,
          status: statusParam,
          location: locationParam,
          search: searchParam,
          limit: 12,
        });

        if (isMounted) {
          if (response.success && Array.isArray(response.items)) {
            setItems(response.items);
            setNextToken(response.nextToken || null);
          } else {
            setError(response.error || 'Failed to retrieve listings.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error connecting to CampusFind API.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [typeParam, categoryParam, statusParam, locationParam, searchParam]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
    updateParam('location', locationInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setLocationInput('');
    setSearchParams(new URLSearchParams());
  };

  const handleLoadMore = async () => {
    if (!nextToken || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const response = await getItems({
        type: typeParam,
        category: categoryParam,
        status: statusParam,
        location: locationParam,
        search: searchParam,
        limit: 12,
        nextToken,
      });

      if (response.success && Array.isArray(response.items)) {
        setItems((prev) => [...prev, ...response.items]);
        setNextToken(response.nextToken || null);
      }
    } catch (err) {
      console.error('Failed to load more items:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Browse Campus Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter, and discover lost belongings or found items reported on campus.
          </p>
        </div>

        {/* Quick Report Buttons */}
        <div className="flex items-center gap-3">
          <a
            href="/report/lost"
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-rose-500" />
            Report Lost
          </a>
          <a
            href="/report/found"
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Report Found
          </a>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="card-premium p-6 space-y-5">
        {/* Type Toggle Tabs: All, Lost, Found */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Report Type:
          </span>
          <button
            onClick={() => updateParam('type', 'all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              typeParam === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => updateParam('type', 'lost')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              typeParam === 'lost'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            Lost Only
          </button>
          <button
            onClick={() => updateParam('type', 'found')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              typeParam === 'found'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            Found Only
          </button>
        </div>

        {/* Search Inputs & Dropdowns */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Keyword Search */}
          <div className="relative">
            <label htmlFor="filter-search" className="block text-xs font-semibold text-slate-700 mb-1">
              Search Keywords
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="filter-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Item name or description..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label htmlFor="filter-category" className="block text-xs font-semibold text-slate-700 mb-1">
              Category
            </label>
            <select
              id="filter-category"
              value={categoryParam}
              onChange={(e) => updateParam('category', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label htmlFor="filter-status" className="block text-xs font-semibold text-slate-700 mb-1">
              Report Status
            </label>
            <select
              id="filter-status"
              value={statusParam}
              onChange={(e) => updateParam('status', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="returned">Returned / Recovered</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label htmlFor="filter-location" className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Location
            </label>
            <input
              id="filter-location"
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="e.g. Library, Gym, Science Hall..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset all filters
            </button>

            <button
              type="submit"
              className="btn-primary text-xs py-2 px-5"
            >
              Apply Search & Filters
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <ItemCardSkeleton key={n} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing {items.length} report{items.length === 1 ? '' : 's'}</span>
            <span>Sorted by newest first</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <ItemCard key={item.itemId} item={item} />
            ))}
          </div>

          {/* Continuation Token Pagination / Load More */}
          {nextToken && (
            <div className="pt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="btn-secondary text-xs py-2.5 px-6 inline-flex items-center gap-2"
              >
                {isLoadingMore ? 'Loading more reports...' : 'Load More Reports'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card-premium p-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No matching reports found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Try adjusting your search terms, changing the category, or clearing the location filter.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-5 btn-secondary text-xs py-2 px-4"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
