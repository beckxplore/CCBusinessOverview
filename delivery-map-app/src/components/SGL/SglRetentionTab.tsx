import React from 'react';
import type { SglRetentionResponse, SglRetentionProduct } from '../../types';

interface Props {
  data: SglRetentionResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const formatWeekLabel = (iso: string) => {
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const date = new Date(iso);
  return `${weekdayFormatter.format(date)}, ${formatter.format(date)}`;
};

const formatNumber = (value?: number | null, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(digits);
};

const formatPercent = (value?: number | null, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(digits)}%`;
};

const LatestWeekRow: React.FC<{ product: SglRetentionProduct }> = ({ product }) => {
  if (!product.weeks.length) {
    return (
      <tr className="text-center text-gray-500">
        <td className="px-4 py-3 text-left font-medium text-gray-900">{product.product}</td>
        <td className="px-4 py-3 text-center text-gray-400" colSpan={5}>
          No retention data
        </td>
      </tr>
    );
  }

  const latestWeek = product.weeks[product.weeks.length - 1];
  return (
    <tr key={`${product.product}-latest`}>
      <td className="px-4 py-3 font-medium text-gray-900">{product.product}</td>
      <td className="px-4 py-3 text-center text-gray-700">{latestWeek.active_leaders}</td>
      <td className="px-4 py-3 text-center text-gray-700">
        {latestWeek.retained_pct !== null && latestWeek.retained_pct !== undefined
          ? `${latestWeek.retained_pct.toFixed(1)}%`
          : '—'}
      </td>
      <td className="px-4 py-3 text-center text-gray-700">{formatPercent(latestWeek.price_down?.local_pct ? -latestWeek.price_down.local_pct : latestWeek.price_down?.local_pct)}</td>
      <td className="px-4 py-3 text-center text-gray-700">{formatPercent(latestWeek.price_down?.sunday_pct ? -latestWeek.price_down.sunday_pct : latestWeek.price_down?.sunday_pct)}</td>
      <td className="px-4 py-3 text-center text-gray-700">
        {formatPercent(latestWeek.price_down?.distribution_pct ? -latestWeek.price_down.distribution_pct : latestWeek.price_down?.distribution_pct)}
      </td>
    </tr>
  );
};

export const SglRetentionTab: React.FC<Props> = ({ data, loading, error, onRetry }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating retention...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No retention data available.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6 space-y-4">
      {data.window && (
        <div className="text-sm text-gray-600">
          Retention reference window: {formatWeekLabel(data.window.start)} – {formatWeekLabel(data.window.end)}
        </div>
      )}

      <div className="bg-white rounded-xl shadow divide-y divide-gray-200">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900">Latest Week Snapshot</h3>
          <p className="text-sm text-gray-500">How each product performed in the most recent Friday–Thursday window.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-center font-medium">Active SGLs</th>
                <th className="px-4 py-3 text-center font-medium">Retained %</th>
                <th className="px-4 py-3 text-center font-medium">Local Δ (%)</th>
                <th className="px-4 py-3 text-center font-medium">Sunday Δ (%)</th>
                <th className="px-4 py-3 text-center font-medium">Distribution Δ (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.products.map(product => (
                <LatestWeekRow key={product.product} product={product} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow divide-y divide-gray-200">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Retention Trends</h3>
          <p className="text-sm text-gray-500">Expand a product to see its week-by-week retention and price gaps.</p>
        </div>
        <div className="divide-y divide-gray-200">
          {data.products.map(product => (
            <details key={product.product} className="p-4" open={product.weeks.length <= 2}>
              <summary className="cursor-pointer font-semibold text-gray-900 flex justify-between items-center">
                {product.product}
                <span className="text-sm text-gray-500">
                  {product.weeks.length} week{product.weeks.length === 1 ? '' : 's'}
                </span>
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Week</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">Active SGLs</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">Retained %</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">Local Δ (%)</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">Sunday Δ (%)</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">Distribution Δ (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {product.weeks.slice(-8).map(week => (
                      <tr key={`${product.product}-${week.week_start}`}>
                        <td className="px-3 py-2 text-left text-gray-700">{formatWeekLabel(week.week_start)}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{week.active_leaders}</td>
                        <td className="px-3 py-2 text-center text-gray-700">
                          {week.retained_pct !== null && week.retained_pct !== undefined
                            ? `${week.retained_pct.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">
                          {formatPercent(week.price_down?.local_pct ? -week.price_down.local_pct : week.price_down?.local_pct)}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">
                          {formatPercent(week.price_down?.sunday_pct ? -week.price_down.sunday_pct : week.price_down?.sunday_pct)}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">
                          {formatPercent(
                            week.price_down?.distribution_pct ? -week.price_down.distribution_pct : week.price_down?.distribution_pct
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

