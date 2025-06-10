import React, { useState, useEffect } from 'react';
import { BarChart3, Network, Target, TrendingUp, Circle } from 'lucide-react';
import { MediaOutlet } from '../types';
import { parseCSV, groupByOwner } from '../utils/csvParser';
import { Timeline } from './Timeline';
import { OwnershipTree } from './OwnershipTree';
import { BubbleChart } from './BubbleChart';
import { RadialTree } from './RadialTree';
import { SelectionPanel } from './SelectionPanel';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<MediaOutlet[]>([]);
  const [highlightedOwner, setHighlightedOwner] = useState<string | undefined>();
  const [selectedOwner, setSelectedOwner] = useState<string | undefined>();
  const [selectedOutlet, setSelectedOutlet] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'ownership' | 'bubble' | 'radial'>('timeline');

  useEffect(() => {
    const loadData = async () => {
      try {
        const outlets = await parseCSV('./data/outlets.csv');
        setData(outlets);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleOwnerHover = (owner: string | undefined) => {
    setHighlightedOwner(owner);
  };

  const handleOwnerSelect = (owner: string | undefined) => {
    setSelectedOwner(owner);
    setSelectedOutlet(undefined); // Clear outlet selection when owner changes
    setHighlightedOwner(owner);
  };

  const handleOutletSelect = (outlet: string | undefined) => {
    setSelectedOutlet(outlet);
    if (outlet) {
      // Find the owner of the selected outlet and highlight them
      const selectedOutletData = data.find(d => d.outlet === outlet);
      if (selectedOutletData) {
        setSelectedOwner(selectedOutletData.owner);
        setHighlightedOwner(selectedOutletData.owner);
      }
    } else {
      setHighlightedOwner(selectedOwner);
    }
  };

  // Filter data based on selections
  const filteredData = data.filter(outlet => {
    if (selectedOwner && outlet.owner !== selectedOwner) return false;
    if (selectedOutlet && outlet.outlet !== selectedOutlet) return false;
    return true;
  });

  const ownershipData = groupByOwner(filteredData);
  const totalOutlets = filteredData.length;
  const totalAudience = filteredData.reduce((sum, outlet) => sum + outlet.audience_size, 0);
  const uniqueOwners = new Set(filteredData.map(d => d.owner)).size;
  const avgAge = Math.round(filteredData.reduce((sum, outlet) => sum + (2024 - outlet.founding_year), 0) / filteredData.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading media outlet data...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: BarChart3 },
    { id: 'ownership', label: 'Tree View', icon: Network },
    { id: 'radial', label: 'Radial View', icon: Circle },
    { id: 'bubble', label: 'Audience', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Media Outlet Dashboard</h1>
          <p className="text-gray-600 text-lg">Interactive visualization of media ownership and reach</p>
          {(selectedOwner || selectedOutlet) && (
            <div className="mt-4 flex justify-center">
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium">
                {selectedOutlet ? (
                  <>Viewing outlet: <span className="font-bold">{selectedOutlet}</span></>
                ) : selectedOwner ? (
                  <>Viewing owner: <span className="font-bold">{selectedOwner}</span></>
                ) : null}
                <button
                  onClick={() => {
                    setSelectedOwner(undefined);
                    setSelectedOutlet(undefined);
                    setHighlightedOwner(undefined);
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{totalOutlets}</h3>
            <p className="text-gray-600">
              {selectedOwner || selectedOutlet ? 'Filtered' : 'Total'} Outlets
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <Network className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{uniqueOwners}</h3>
            <p className="text-gray-600">
              {selectedOwner || selectedOutlet ? 'Filtered' : 'Unique'} Owners
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">
              {totalAudience > 0 ? (totalAudience / 1000000).toFixed(1) + 'M' : '0'}
            </h3>
            <p className="text-gray-600">Total Audience</p>
          </div>

          {/* <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{avgAge || 0}</h3>
            <p className="text-gray-600">Avg Age (Years)</p>
          </div> */}
        </div>

        {/* Main Content Area */}
        <div className="flex gap-6">
          {/* Left Panel - Selection Interface */}
          <div className="flex-shrink-0">
            <SelectionPanel
              data={data}
              selectedOwner={selectedOwner}
              selectedOutlet={selectedOutlet}
              onOwnerSelect={handleOwnerHighlight}
              onOutletSelect={handleOutletHighlight}
            />
          </div>

          {/* Right Panel - Visualizations */}
          <div className="flex-1">
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="bg-white rounded-lg shadow-lg p-1 flex">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center px-6 py-3 rounded-md transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart Container */}
            <div className="flex justify-center">
              {activeTab === 'timeline' && (
                <Timeline
                  data={filteredData}
                  highlightedOwner={highlightedOwner}
                  onOwnerHover={handleOwnerHover}
                />
              )}
              {activeTab === 'ownership' && (
                <OwnershipTree
                  data={ownershipData}
                  highlightedOwner={highlightedOwner}
                  onOwnerHover={handleOwnerHover}
                />
              )}
              {activeTab === 'radial' && (
                <RadialTree
                  data={ownershipData}
                  highlightedOwner={highlightedOwner}
                  onOwnerHover={handleOwnerHover}
                />
              )}
              {activeTab === 'bubble' && (
                <BubbleChart
                  data={filteredData}
                  highlightedOwner={highlightedOwner}
                  onOwnerHover={handleOwnerHover}
                />
              )}
            </div>
          </div>
        </div>

        {highlightedOwner && (
          <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <p className="font-semibold">Highlighting: {highlightedOwner}</p>
          </div>
        )}
      </div>
    </div>
  );
};