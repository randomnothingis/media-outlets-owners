import React from 'react';
import { MediaOutlet } from '../types';
import { Users, Building2 } from 'lucide-react';

interface SelectionPanelProps {
  data: MediaOutlet[];
  selectedOwner?: string;
  selectedOutlet?: string;
  onOwnerSelect: (owner: string | undefined) => void;
  onOutletSelect: (outlet: string | undefined) => void;
}

export const SelectionPanel: React.FC<SelectionPanelProps> = ({
  data,
  selectedOwner,
  selectedOutlet,
  onOwnerSelect,
  onOutletSelect
}) => {
  // Get unique owners with outlet counts
  const owners = Array.from(
    data.reduce((map, outlet) => {
      if (!map.has(outlet.owner)) {
        map.set(outlet.owner, {
          name: outlet.owner,
          count: 0,
          totalAudience: 0
        });
      }
      const ownerData = map.get(outlet.owner)!;
      ownerData.count++;
      ownerData.totalAudience += outlet.audience_size || 0;
      return map;
    }, new Map())
  ).sort((a, b) => b.count - a.count);
  console.log('owners', owners);

  // Sort outlets by audience size (descending)
  const outlets = [...data].sort((a, b) => (b.audience_size || 0) - (a.audience_size || 0));

  const formatAudience = (size: number) => {
    if (size >= 1000000000) return `${(size / 1000000000).toFixed(1)}B`;
    if (size >= 1000000) return `${(size / 1000000).toFixed(1)}M`;
    if (size >= 1000) return `${(size / 1000).toFixed(0)}K`;
    return size.toString();
  };

  return (
    <div className="w-80 bg-white rounded-xl shadow-lg p-6 h-full flex flex-row">
      {/* Owners Section */}
      <div className="mb-6 flex-1">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-bold text-gray-800">Owners</h3>
          <span className="ml-2 text-sm text-gray-500">({owners.length})</span>
        </div>
        
        <div className="space-y-1 max-h-80 overflow-y-auto">
          <button
            onClick={() => onOwnerSelect(undefined)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
              !selectedOwner
                ? 'bg-blue-50 border-2 border-blue-200 text-blue-800'
                : 'hover:bg-gray-50 border-2 border-transparent'
            }`}
          >
            <div className="font-medium text-sm">All Owners</div>
            <div className="text-xs text-gray-500">View all media outlets</div>
          </button>


          {owners.map((owner) => (
            <button
              key={owner[1].name}
              onClick={() => onOwnerSelect(owner[1].name === selectedOwner ? undefined : owner[1].name)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                selectedOwner === owner[1].name
                  ? 'bg-blue-50 border-2 border-blue-200 text-blue-800'
                  : 'hover:bg-gray-50 border-2 border-transparent'
              }`}
            >
              <div className="font-medium text-sm truncate" title={owner.name}>
                {owner[1].name}
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  {owner[1].count} outlet{owner[1].count !== 1 ? 's' : ''}
                </span>
                {owner.totalAudience > 0 && (
                  <span className="text-xs text-gray-600 font-medium">
                    {formatAudience(owner[1].totalAudience)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Outlets Section */}
      <div className="flex-1">
        <div className="flex items-center mb-4">
          <Building2 className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-bold text-gray-800">Outlets</h3>
          <span className="ml-2 text-sm text-gray-500">({outlets.length})</span>
        </div>
        
        <div className="space-y-1 max-h-80 overflow-y-auto">
          <button
            onClick={() => onOutletSelect(undefined)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
              !selectedOutlet
                ? 'bg-green-50 border-2 border-green-200 text-green-800'
                : 'hover:bg-gray-50 border-2 border-transparent'
            }`}
          >
            <div className="font-medium text-sm">All Outlets</div>
            <div className="text-xs text-gray-500">View all media outlets</div>
          </button>
          
          {outlets.map((outlet) => (
            <button
              key={outlet.outlet}
              onClick={() => onOutletSelect(outlet.outlet === selectedOutlet ? undefined : outlet.outlet)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                selectedOutlet === outlet.outlet
                  ? 'bg-green-50 border-2 border-green-200 text-green-800'
                  : 'hover:bg-gray-50 border-2 border-transparent'
              }`}
            >
              <div className="font-medium text-sm truncate" title={outlet.outlet}>
                {outlet.outlet}
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500 truncate" title={outlet.owner}>
                  {outlet.owner}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-600">
                    {outlet.founding_year}
                  </span>
                  {outlet.audience_size > 0 && (
                    <span className="text-xs text-gray-600 font-medium">
                      {formatAudience(outlet.audience_size)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};