import React from 'react';
import { NavigationItem } from './NavigationItem';
import {
  LayoutDashboard,
  Map,
  TrendingUp,
  DollarSign,
  Target,
  FlaskConical,
  Users,
  Landmark,
  Building2,
  CreditCard
} from 'lucide-react';

export type NavigationSection = 
  | 'overview' 
  | 'analytics' 
  | 'sgl'
  | 'profitability' 
  | 'forecast' 
  | 'strategy' 
  | 'playground'
  | 'benchmark'
  | 'b2b-financial'
  | 'b2b-customer';

interface SidebarProps {
  activeSection: NavigationSection;
  onSectionChange: (_section: NavigationSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col flex-shrink-0">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-xl font-bold">ChipChip</h1>
        <p className="text-xs text-gray-400 mt-1">Business Intelligence</p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" style={{ overflowX: 'visible' }}>
        <NavigationItem
          icon={<LayoutDashboard size={20} />}
          label="Overview"
          section="overview"
          active={activeSection === 'overview'}
          onClick={() => onSectionChange('overview')}
          tooltip="High-level business dashboard showing weekly revenue, costs, profit, and top/bottom performing products."
        />
        <NavigationItem
          icon={<Map size={20} />}
          label="Analytics"
          section="analytics"
          active={activeSection === 'analytics'}
          onClick={() => onSectionChange('analytics')}
          tooltip="Interactive map showing delivery locations, group leaders, and order distribution across Addis Ababa with advanced filtering."
        />
        <NavigationItem
          icon={<Users size={20} />}
          label="SGL"
          section="sgl"
          active={activeSection === 'sgl'}
          onClick={() => onSectionChange('sgl')}
          tooltip="Super Group Leader sensitivity map highlighting SGL hubs and demand responsiveness without regular leaders."
        />
        <NavigationItem
          icon={<DollarSign size={20} />}
          label="Profitability"
          section="profitability"
          active={activeSection === 'profitability'}
          onClick={() => onSectionChange('profitability')}
          tooltip="Product-by-product profitability analysis with detailed cost breakdowns (procurement, operations, commissions)."
        />
        <NavigationItem
          icon={<TrendingUp size={20} />}
          label="Forecast"
          section="forecast"
          active={activeSection === 'forecast'}
          onClick={() => onSectionChange('forecast')}
          tooltip="Demand forecasting based on price elasticity. Test price changes and see predicted impact on order volume using real customer data."
        />
        <NavigationItem
          icon={<Target size={20} />}
          label="Strategy"
          section="strategy"
          active={activeSection === 'strategy'}
          onClick={() => onSectionChange('strategy')}
          tooltip="Strategic planning tools including SGL tier optimization, competitive pricing recommendations, and demand-aware pricing strategies."
        />
        <NavigationItem
          icon={<FlaskConical size={20} />}
          label="Playground"
          section="playground"
          active={activeSection === 'playground'}
          onClick={() => onSectionChange('playground')}
          tooltip="Interactive scenario simulator. Test what-if scenarios combining price changes, commission adjustments, and operational cost optimizations."
        />
        <NavigationItem
          icon={<Landmark size={20} />}
          label="Benchmark"
          section="benchmark"
          active={activeSection === 'benchmark'}
          onClick={() => onSectionChange('benchmark')}
          tooltip="Map of benchmark locations (markets, supermarkets, etc.) for price comparison."
        />
        
        {/* B2B Section Divider */}
        <div className="pt-4 mt-4 border-t border-gray-700">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            B2B Analytics
          </p>
        </div>
        
        <NavigationItem
          icon={<Building2 size={20} />}
          label="B2B Financial"
          section="b2b-financial"
          active={activeSection === 'b2b-financial'}
          onClick={() => onSectionChange('b2b-financial')}
          tooltip="B2B financial analytics including business overview, profit margins (CM1/CM2/CM3), cost structure, revenue trends, and cash flow analysis."
        />
        <NavigationItem
          icon={<CreditCard size={20} />}
          label="B2B Customer"
          section="b2b-customer"
          active={activeSection === 'b2b-customer'}
          onClick={() => onSectionChange('b2b-customer')}
          tooltip="B2B customer analytics including customer profitability (CLTV), credit risk dashboard, payment behavior, and DSO metrics."
        />
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-400 flex-shrink-0">
        <p>Delivery Map Analytics v2.0</p>
        <p className="mt-1">Comprehensive BI Platform</p>
      </div>
    </div>
  );
};

