import React from 'react';
import { InfoTooltip } from '../Common/InfoTooltip';

interface StapleSummary {
  product: string;
  sellingPrice: number | null;
  localBenchmark: number | null;
  procurementCost: number | null;
  totalCost: number | null;
  marginPerKg: number | null;
  benchmarkGap: number | null;
  weeklyVolume: number | null;
}

interface StapleProductGridProps {
  items: StapleSummary[];
}

const formatCurrency = (value: number | null, fractionDigits = 0) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

const formatKg = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K kg`;
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`;
};

export const StapleProductGrid: React.FC<StapleProductGridProps> = ({ items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Staple Product Pulse</h3>
        <InfoTooltip 
          content="Live selling prices pulled from ClickHouse vs latest external benchmarks. Focus on these staples when adjusting pricing or negotiating procurement."
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => {
          const marginClass =
            item.marginPerKg === null
              ? 'text-gray-500'
              : item.marginPerKg >= 0
                ? 'text-emerald-600'
                : 'text-rose-600';
          const gapClass =
            item.benchmarkGap === null
              ? 'text-gray-500'
              : item.benchmarkGap <= 0
                ? 'text-emerald-600'
                : 'text-amber-600';

          return (
            <div
              key={item.product}
              className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900">{item.product}</h4>
                <span className="text-sm text-gray-500">{formatKg(item.weeklyVolume)}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-gray-500">Selling Price</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(item.sellingPrice)}
                    <span className="text-xs text-gray-500 ml-1">ETB</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 flex items-center gap-1">
                    Benchmark
                    <InfoTooltip content="Average 7-day benchmark price (all channels)." placement="top" />
                  </p>
                  <p className="font-semibold text-gray-900">
                    {item.localBenchmark !== null ? formatCurrency(item.localBenchmark) : 'No data'}
                    {item.localBenchmark !== null && <span className="text-xs text-gray-500 ml-1">ETB</span>}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Cost / kg</p>
                  <p className="font-semibold text-gray-900">
                    {item.totalCost !== null ? formatCurrency(item.totalCost, 1) : '—'}
                    {item.totalCost !== null && <span className="text-xs text-gray-500 ml-1">ETB</span>}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 flex items-center gap-1">
                    Margin / kg
                    <InfoTooltip content="Selling price minus procurement, operations, and commission." placement="top" />
                  </p>
                  <p className={`font-semibold ${marginClass}`}>
                    {item.marginPerKg !== null ? formatCurrency(item.marginPerKg, 1) : '—'}
                    {item.marginPerKg !== null && <span className="text-xs text-gray-400 ml-1">ETB</span>}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 flex items-center gap-1">
                    Vs. Benchmark
                    <InfoTooltip content="Positive = priced above benchmark, Negative = priced below." placement="top" />
                  </p>
                  <p className={`font-semibold ${gapClass}`}>
                    {item.benchmarkGap !== null ? formatCurrency(item.benchmarkGap, 1) : '—'}
                    {item.benchmarkGap !== null && <span className="text-xs text-gray-400 ml-1">ETB</span>}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Procurement Cost</p>
                  <p className="font-semibold text-gray-900">
                    {item.procurementCost !== null ? formatCurrency(item.procurementCost, 1) : '—'}
                    {item.procurementCost !== null && <span className="text-xs text-gray-500 ml-1">ETB</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

