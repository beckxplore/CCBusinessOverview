import React, { useState } from 'react';
import { SGLTierCalculator } from './SGLTierCalculator';
import { PricingCompetitive } from './PricingCompetitive';
import { PricingDemandAware } from './PricingDemandAware';
import { BundleOpportunities } from './BundleOpportunities';

export const StrategyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'competitive' | 'demand'>('tiers');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="px-6 py-3">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('tiers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tiers'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              SGL Tier System
            </button>
            <button
              onClick={() => setActiveTab('competitive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'competitive'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Competitive Pricing
            </button>
            <button
              onClick={() => setActiveTab('demand')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'demand'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Demand-Aware Pricing
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <BundleOpportunities onSelectTab={setActiveTab} />

        <div>
          {activeTab === 'tiers' && <SGLTierCalculator />}
          {activeTab === 'competitive' && <PricingCompetitive />}
          {activeTab === 'demand' && <PricingDemandAware />}
        </div>
      </div>
    </div>
  );
};

