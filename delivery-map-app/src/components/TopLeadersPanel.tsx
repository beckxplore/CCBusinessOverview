import React from 'react';

interface LeaderAnalysis {
  rank: number;
  leaderId: string;
  name: string;
  phone: string;
  sgLocations: number;
  sgOrders: number;
  sgKg: number;
  ngLocationsIn05km: number;
  ngOrdersIn05km: number;
  totalPotential: number;
  growthFactor: number;
}

interface TopLeadersPanelProps {
  leaders: LeaderAnalysis[];
  radiusKm: number;
}

export const TopLeadersPanel: React.FC<TopLeadersPanelProps> = ({ leaders, radiusKm }) => {
  if (leaders.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        🏆 Top 15 Super Group Leaders Analysis
        <span className="text-xs font-normal text-gray-500">({radiusKm}km radius)</span>
      </h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {leaders.map((leader) => (
          <div
            key={leader.leaderId}
            className={`p-3 rounded-lg border ${
              leader.rank <= 3
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-300'
                : leader.rank <= 5
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    leader.rank === 1
                      ? 'bg-yellow-400 text-yellow-900'
                      : leader.rank === 2
                      ? 'bg-gray-300 text-gray-800'
                      : leader.rank === 3
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {leader.rank}
                </span>
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {leader.name || 'Leader ' + leader.rank}
                  </p>
                  <p className="text-xs text-gray-600">{leader.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {leader.growthFactor.toFixed(1)}x
                </p>
                <p className="text-xs text-gray-500">Growth</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <p className="text-gray-500">Current</p>
                <p className="font-semibold text-red-600">{leader.sgOrders.toLocaleString()}</p>
                <p className="text-gray-400">{leader.sgLocations} locs</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="text-gray-500">+NG ({radiusKm}km)</p>
                <p className="font-semibold text-blue-600">+{leader.ngOrdersIn05km.toLocaleString()}</p>
                <p className="text-gray-400">{leader.ngLocationsIn05km} locs</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="text-gray-500">Total</p>
                <p className="font-semibold text-green-600">{leader.totalPotential.toLocaleString()}</p>
                <p className="text-gray-400">potential</p>
              </div>
            </div>

            {leader.rank <= 3 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs font-medium text-green-700">
                  {leader.ngLocationsIn05km > 150
                    ? '🟢 EXCELLENT - High density coverage'
                    : leader.ngLocationsIn05km > 80
                    ? '🟡 GOOD - Moderate coverage'
                    : '🟠 FAIR - Consider wider radius'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-green-50 rounded p-2">
            <p className="text-green-700 font-medium">Total Coverage</p>
            <p className="text-green-900 font-bold text-lg">
              {leaders.reduce((sum, l) => sum + l.ngLocationsIn05km, 0)} NG locs
            </p>
          </div>
          <div className="bg-blue-50 rounded p-2">
            <p className="text-blue-700 font-medium">Total Potential</p>
            <p className="text-blue-900 font-bold text-lg">
              {leaders.reduce((sum, l) => sum + l.totalPotential, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

