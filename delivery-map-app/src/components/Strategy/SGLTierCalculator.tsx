import React, { useState, useEffect } from 'react';
import type { SGLTier, ProductCost } from '../../types';
import { DataStore } from '../../utils/dataStore';
import { formatCurrency } from '../../utils/profitabilityCalc';

export const SGLTierCalculator: React.FC = () => {
  const [tiers, setTiers] = useState<SGLTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<SGLTier | null>(null);
  const [productCosts, setProductCosts] = useState<ProductCost[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!DataStore.isLoaded()) {
      await DataStore.loadAll();
    }
    const loadedTiers = DataStore.getSGLTiers();
    const loadedCosts = DataStore.getProductCosts();
    setTiers(loadedTiers);
    setProductCosts(loadedCosts);
    if (loadedTiers.length > 0) {
      setSelectedTier(loadedTiers[0]);
    }
  };

  const calculateTierImpact = (tier: SGLTier) => {
    const totalSavings = tier.cost_savings_logistics + tier.cost_savings_packaging + tier.cost_savings_assistant;
    const netCostToChipChip = tier.commission_etb_per_kg - totalSavings;
    return { totalSavings, netCostToChipChip };
  };

  const calculateProductImpact = (product: ProductCost, tier: SGLTier) => {
    const currentCost = product.procurement_cost + product.operational_cost + product.sgl_commission;
    const { totalSavings } = calculateTierImpact(tier);
    const newOperationalCost = Math.max(0, product.operational_cost - totalSavings);
    const newCost = product.procurement_cost + newOperationalCost + tier.commission_etb_per_kg;
    const costDiff = newCost - currentCost;
    const newMargin = product.selling_price - newCost;
    
    return { currentCost, newCost, costDiff, newMargin };
  };

  const toggleProduct = (productName: string) => {
    setSelectedProducts(prev => 
      prev.includes(productName)
        ? prev.filter(p => p !== productName)
        : [...prev, productName]
    );
  };

  const selectedProductsImpact = selectedProducts.map(productName => {
    const product = productCosts.find(p => p.product_name === productName);
    if (!product || !selectedTier) return null;
    return {
      product: productName,
      ...calculateProductImpact(product, selectedTier)
    };
  }).filter(Boolean);

  const totalImpact = selectedProductsImpact.reduce((sum, item) => sum + (item?.costDiff || 0), 0);

  return (
    <div className="space-y-6">
      {/* Tier Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">SGL Tier System</h3>
        
        <div className="grid grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const { totalSavings, netCostToChipChip } = calculateTierImpact(tier);
            const isSelected = selectedTier?.tier_name === tier.tier_name;
            
            return (
              <div
                key={tier.tier_name}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setSelectedTier(tier)}
              >
                <h4 className="font-semibold text-sm mb-2">{tier.tier_name}</h4>
                <p className="text-xs text-gray-600 mb-3">{tier.description}</p>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commission:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(tier.commission_etb_per_kg)} ETB/kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Savings:</span>
                    <span className="font-semibold text-green-600">
                      -{formatCurrency(totalSavings)} ETB/kg
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Net Impact:</span>
                    <span className={`font-bold ${netCostToChipChip < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netCostToChipChip < 0 ? `Save ${formatCurrency(Math.abs(netCostToChipChip))}` : `Cost ${formatCurrency(netCostToChipChip)}`} ETB/kg
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Selection */}
      {selectedTier && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Apply {selectedTier.tier_name} to Products</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Select products to see tier impact:</p>
            <div className="flex flex-wrap gap-2">
              {productCosts.map(product => (
                <button
                  key={product.product_name}
                  onClick={() => toggleProduct(product.product_name)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    selectedProducts.includes(product.product_name)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {product.product_name}
                </button>
              ))}
            </div>
          </div>

          {selectedProducts.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Impact Analysis</h4>
              <div className="space-y-2">
                {selectedProductsImpact.map((impact, idx) => impact && (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{impact.product}</span>
                    <div className="text-sm">
                      <span className="text-gray-600">Cost: </span>
                      <span className="font-semibold">
                        {formatCurrency(impact.currentCost)} → {formatCurrency(impact.newCost)} ETB/kg
                      </span>
                      <span className={`ml-2 font-bold ${impact.costDiff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({impact.costDiff < 0 ? '-' : '+'}{formatCurrency(Math.abs(impact.costDiff))})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Cost Impact:</span>
                  <span className={`text-xl font-bold ${totalImpact < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalImpact < 0 ? 'Save' : 'Cost'} {formatCurrency(Math.abs(totalImpact))} ETB/kg
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

