import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Eye,
  ArrowRight,
  Laptop,
  Briefcase,
  CreditCard,
  BookOpen,
  Shirt,
  Key,
  Watch,
  HelpCircle,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { CATEGORIES } from '../config';

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

export function ItemCard({ item }) {
  if (!item) return null;

  const {
    itemId,
    name,
    type,
    category,
    location,
    eventDate,
    description,
    status,
    imageUrl,
    viewCount = 0,
  } = item;

  const isLost = type === 'lost';
  const IconComponent = CATEGORY_ICONS[category] || HelpCircle;
  const categoryMeta = CATEGORIES.find((c) => c.id === category);

  return (
    <article className="card-premium overflow-hidden flex flex-col group h-full">
      {/* Thumbnail or Fallback Category Graphic */}
      <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0 border-b border-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 group-hover:text-indigo-500 transition-colors">
            <IconComponent className="w-16 h-16 stroke-[1.25] mb-2" />
            <span className="text-xs font-medium text-slate-400">
              {categoryMeta?.label || 'Item Graphic'}
            </span>
          </div>
        )}

        {/* Lost / Found Type Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm ${
              isLost
                ? 'bg-rose-600 text-white shadow-rose-900/20'
                : 'bg-emerald-600 text-white shadow-emerald-900/20'
            }`}
          >
            {isLost ? 'Lost Item' : 'Found Item'}
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={status} className="shadow-sm backdrop-blur-md bg-white/95" />
        </div>
      </div>

      {/* Item Information */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Category & Date */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-medium text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
            {categoryMeta?.label || category}
          </span>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{eventDate || 'Recent'}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
          {name}
        </h3>

        {/* Location */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {/* Description snippet */}
        <p className="mt-2.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Card Footer */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-slate-400" title="Views">
            <Eye className="w-3.5 h-3.5" />
            <span>{viewCount} views</span>
          </div>

          <Link
            to={`/items/${itemId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 group-hover:translate-x-0.5 transition"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
