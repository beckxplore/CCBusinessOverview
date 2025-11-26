import React, { useMemo } from 'react';
import { Target, ShoppingCart, Sparkles, ArrowUpRight } from 'lucide-react';
import { InfoTooltip } from '../Common/InfoTooltip';
import { associationRules, type AssociationRule } from '../../data/associationRules';
import type { NavigationSection } from '../Navigation/Sidebar';

type StrategyTab = 'tiers' | 'competitive' | 'demand';

interface BundleOpportunitiesProps {
  onSelectTab: (_tab: StrategyTab) => void;
}

interface OpportunityConfig {
  id: string;
  title: string;
  summary: string;
  ruleId: string;
  primary: {
    label: string;
    targetSection: NavigationSection;
  };
  secondary: {
    label: string;
    tab: StrategyTab;
  };
}

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const opportunityConfigs: OpportunityConfig[] = [
  {
    id: 'onion-bundle',
    title: 'Dual Onion + Tomato Power Bundle',
    summary:
      'Use Beetroot + Potato + Red Onion A orders to upsell the scarce Red Onion B & Tomato combo. Perfect for premium market baskets mid-week.',
    ruleId: 'lift-1',
    primary: {
      label: 'Test Bundle in Playground',
      targetSection: 'playground',
    },
    secondary: {
      label: 'Adjust Competitive Pricing',
      tab: 'competitive',
    },
  },
  {
    id: 'red-onion-upsell',
    title: 'Red Onion B Upsell Trigger',
    summary:
      'When Carrot + Red Onion B appear, lean into Beetroot + Potato + Tomato as the add-on set. Great for bundle discounts or free-delivery promos.',
    ruleId: 'lift-2',
    primary: {
      label: 'Build Promo Scenario',
      targetSection: 'playground',
    },
    secondary: {
      label: 'Review Demand Sensitivity',
      tab: 'demand',
    },
  },
  {
    id: 'tomato-anchor',
    title: 'Tomato Anchor Assortment',
    summary:
      'Beetroot + Carrot + Potato + Red Onion A baskets almost guarantee a Tomato add-on. Anchor Tomato pricing and highlight freshness guarantees.',
    ruleId: 'balanced-2',
    primary: {
      label: 'Plan Tier Strategy',
      targetSection: 'playground',
    },
    secondary: {
      label: 'Open SGL Tier System',
      tab: 'tiers',
    },
  },
];

const triggerNavigation = (section: NavigationSection) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<NavigationSection>('navigate-section', { detail: section }));
  }
};

const findRuleById = (id: string): AssociationRule | undefined =>
  associationRules.find(rule => rule.id === id);

export const BundleOpportunities: React.FC<BundleOpportunitiesProps> = ({ onSelectTab }) => {
  const opportunities = useMemo(() => {
    return opportunityConfigs
      .map(config => {
        const rule = findRuleById(config.ruleId);
        if (!rule) {
          return null;
        }
        return { config, rule };
      })
      .filter((item): item is { config: OpportunityConfig; rule: AssociationRule } => item !== null);
  }, []);

  if (opportunities.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Bundle Opportunity Playbook
            <InfoTooltip
              content="High-lift association rules from super group leader baskets converted into ready-to-run bundle plays. Launch a scenario or tweak pricing straight from here."
            />
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Turn top co-purchase patterns into revenue this week. Each play blends lift, confidence, and quick actions.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          <Sparkles size={14} />
          Auto-curated
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 p-6">
        {opportunities.map(({ config, rule }) => (
          <div key={config.id} className="border border-gray-200 rounded-lg p-4 flex flex-col gap-4 bg-gray-50">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-2 shadow-sm border border-gray-200">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{config.title}</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{config.summary}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-md p-3 text-sm">
              <p className="font-medium text-gray-900 flex items-center gap-1">
                {rule.antecedents.join(', ')}
                <ArrowUpRight size={14} className="text-indigo-500" />
                {rule.consequents.join(', ')}
              </p>
              <p className="text-xs text-gray-600 mt-1">{rule.insight}</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs font-medium">
                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600">Support {formatPercent(rule.support)}</span>
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  Confidence {formatPercent(rule.confidence)}
                </span>
                <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-600">Lift {rule.lift.toFixed(2)}×</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <button
                type="button"
                onClick={() => triggerNavigation(config.primary.targetSection)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 transition"
              >
                <ShoppingCart size={16} />
                {config.primary.label}
              </button>
              <button
                type="button"
                onClick={() => onSelectTab(config.secondary.tab)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition"
              >
                {config.secondary.label}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


