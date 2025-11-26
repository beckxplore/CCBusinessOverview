import React from 'react';
import { Lightbulb, PackageSearch, Sparkles } from 'lucide-react';
import { associationRules } from '../../data/associationRules';
import type { AssociationRule } from '../../data/associationRules';
import { InfoTooltip } from '../Common/InfoTooltip';

const CATEGORY_CONFIG: Record<AssociationRule['category'], {
  title: string;
  description: string;
  icon: React.ReactNode;
}> = {
  core: {
    title: 'High-Frequency Combos',
    description: 'Frequent pairings leaders already buy together. Great for default bundles.',
    icon: <PackageSearch className="w-5 h-5 text-blue-500" />
  },
  lift: {
    title: 'Hidden Opportunities',
    description: 'Lower-volume but powerful lifts that reveal premium bundle ideas.',
    icon: <Sparkles className="w-5 h-5 text-purple-500" />
  },
  balanced: {
    title: 'Balanced Winners',
    description: 'Rules that balance reach, reliability, and lift for strategic focus.',
    icon: <Lightbulb className="w-5 h-5 text-amber-500" />
  }
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const formatRuleLabel = (items: string[]) => items.join(', ');

export const LeaderBasketInsights: React.FC = () => {
  const grouped = associationRules.reduce<Record<AssociationRule['category'], AssociationRule[]>>(
    (acc, rule) => {
      acc[rule.category] = acc[rule.category] ?? [];
      acc[rule.category]?.push(rule);
      return acc;
    },
    { core: [], lift: [], balanced: [] }
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Leader Basket Insights
              <InfoTooltip
                content="Association rules derived from super group leader baskets. Support shows how often the combo occurs, confidence shows reliability, and lift shows strength versus random chance."
              />
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Spot the most actionable co-purchase patterns so you can plan bundles, promos, and stocking before the next buying cycle.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-3">
        {Object.entries(CATEGORY_CONFIG).map(([categoryKey, meta]) => {
          const rules = grouped[categoryKey as AssociationRule['category']]?.slice(0, 3) ?? [];

          return (
            <div key={categoryKey} className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-full bg-white p-2 shadow-sm border border-gray-200">
                  {meta.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{meta.title}</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{meta.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                    <p className="text-sm font-medium text-gray-900">
                      {formatRuleLabel(rule.antecedents)}
                      <span className="text-gray-400"> → </span>
                      {formatRuleLabel(rule.consequents)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rule.insight}</p>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                        Support {formatPercent(rule.support)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                        Confidence {formatPercent(rule.confidence)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">
                        Lift {rule.lift.toFixed(2)}×
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
