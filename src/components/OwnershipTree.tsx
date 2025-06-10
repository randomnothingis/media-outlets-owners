import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { OwnershipNode } from '../types';

interface OwnershipTreeProps {
  data: OwnershipNode[];
  highlightedOwner?: string;
  onOwnerHover: (owner: string | undefined) => void;
}

export const OwnershipTree: React.FC<OwnershipTreeProps> = ({ data, highlightedOwner, onOwnerHover }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 1000;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    // Sort data by number of outlets (descending) for better layout
    const sortedData = [...data].sort((a, b) => (b.children?.length || 0) - (a.children?.length || 0));

    // Filter data based on expanded state
    const filteredData = sortedData.map(owner => ({
      ...owner,
      children: expandedNodes.has(owner.id) ? owner.children : []
    }));

    // Create hierarchy
    const root = d3.hierarchy({
      id: 'root',
      name: 'Media Outlets',
      type: 'root' as const,
      children: filteredData
    });

    // Calculate dynamic height based on visible nodes
    const visibleNodeCount = root.descendants().length;
    const nodeHeight = 60; // Space per node
    const minHeight = 400;
    const calculatedHeight = Math.max(minHeight, visibleNodeCount * nodeHeight);
    const height = Math.min(calculatedHeight, 800); // Cap maximum height

    // Create tree layout with dynamic sizing
    const treeLayout = d3.tree<any>()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .separation((a, b) => {
        // Increase separation for better readability
        return a.parent === b.parent ? 1.8 : 2.5;
      });

    treeLayout(root);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(sortedData.map(d => d.name));

    // Add links with better styling
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical()
        .x((d: any) => d.x)
        .y((d: any) => d.y))
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', d => {
        // Thicker lines for highlighted connections
        if (!highlightedOwner) return 2;
        const isHighlighted = d.source.data.name === highlightedOwner || 
                             d.target.data.name === highlightedOwner ||
                             (d.target.data.outlet && d.target.data.outlet.owner === highlightedOwner);
        return isHighlighted ? 3 : 1;
      })
      .attr('opacity', d => {
        if (!highlightedOwner) return 0.6;
        const isHighlighted = d.source.data.name === highlightedOwner || 
                             d.target.data.name === highlightedOwner ||
                             (d.target.data.outlet && d.target.data.outlet.owner === highlightedOwner);
        return isHighlighted ? 1 : 0.2;
      });

    // Add nodes
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('mouseover', function(event, d) {
        if (d.data.type === 'owner') {
          onOwnerHover(d.data.name);
        } else if (d.data.outlet) {
          onOwnerHover(d.data.outlet.owner);
        }

        // Show tooltip for outlets
        if (d.data.outlet) {
          const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
            .style('max-width', '200px');

          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${d.data.outlet.outlet}</div>
            <div>Owner: ${d.data.outlet.owner}</div>
            <div>Founded: ${d.data.outlet.founding_year}</div>
            <div>Audience: ${d.data.outlet.audience_size ? d.data.outlet.audience_size.toLocaleString() : 'N/A'}</div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
        }
      })
      .on('mouseout', () => {
        onOwnerHover(undefined);
        d3.selectAll('.tooltip').remove();
      })
      .on('click', function(event, d) {
        // Only allow clicking on owner nodes that have children
        if (d.data.type === 'owner') {
          const originalOwner = sortedData.find(owner => owner.id === d.data.id);
          if (originalOwner && originalOwner.children && originalOwner.children.length > 0) {
            toggleNode(d.data.id);
          }
        }
      })
      .style('cursor', d => {
        if (d.data.type === 'owner') {
          const originalOwner = sortedData.find(owner => owner.id === d.data.id);
          return (originalOwner && originalOwner.children && originalOwner.children.length > 0) ? 'pointer' : 'default';
        }
        return 'pointer';
      });

    // Add circles for nodes with better sizing
    nodes.append('circle')
      .attr('r', d => {
        if (d.data.type === 'root') return 12;
        if (d.data.type === 'owner') {
          const originalOwner = sortedData.find(owner => owner.id === d.data.id);
          const childCount = originalOwner?.children?.length || 0;
          return Math.min(25, 10 + childCount * 1.5);
        }
        return 8;
      })
      .attr('fill', d => {
        if (d.data.type === 'root') return '#6366f1';
        if (d.data.type === 'owner') return colorScale(d.data.name);
        return d.data.outlet ? colorScale(d.data.outlet.owner) : '#94a3b8';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .attr('opacity', d => {
        if (!highlightedOwner) return 1;
        const isHighlighted = d.data.name === highlightedOwner || 
                             (d.data.outlet && d.data.outlet.owner === highlightedOwner);
        return isHighlighted ? 1 : 0.3;
      });

    // Add expand/collapse indicators for owner nodes
    nodes.filter(d => {
      if (d.data.type === 'owner') {
        const originalOwner = sortedData.find(owner => owner.id === d.data.id);
        return originalOwner && originalOwner.children && originalOwner.children.length > 0;
      }
      return false;
    })
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#fff')
    .attr('pointer-events', 'none')
    .text(d => expandedNodes.has(d.data.id) ? '−' : '+');

    // Add text labels with better positioning and truncation
    nodes.append('text')
      .attr('dy', d => {
        if (d.data.type === 'owner') return -35;
        return d.children ? -15 : 20;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', d => {
        if (d.data.type === 'root') return '16px';
        if (d.data.type === 'owner') return '13px';
        return '11px';
      })
      .attr('font-weight', d => d.data.type === 'owner' ? 'bold' : 'normal')
      .attr('fill', '#374151')
      .attr('padding', '10px')
      .attr('opacity', d => {
        if (!highlightedOwner) return 1;
        const isHighlighted = d.data.name === highlightedOwner || 
                             (d.data.outlet && d.data.outlet.owner === highlightedOwner);
        return isHighlighted ? 1 : 0.4;
      })
      .text(d => {
        if (d.data.type === 'root') return 'Media Outlets';
        const name = d.data.name;
        const maxLength = d.data.type === 'owner' ? 18 : 16;
        return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
      })
      .append('title') // Add full name as tooltip
      .text(d => d.data.name);

    // Add outlet count for owners with better positioning
    nodes.filter(d => d.data.type === 'owner')
      .append('text')
      .attr('dy', -18)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'normal')
      .attr('fill', '#6b7280')
      .attr('opacity', d => {
        if (!highlightedOwner) return 0.8;
        return d.data.name === highlightedOwner ? 1 : 0.3;
      })
      .text(d => {
        const originalOwner = sortedData.find(owner => owner.id === d.data.id);
        const count = originalOwner?.children?.length || 0;
        const expanded = expandedNodes.has(d.data.id);
        return `${count} outlets ${expanded ? '(expanded)' : '(click to expand)'}`;
      });

    // Add audience size for outlets with better formatting
    nodes.filter(d => d.data.outlet && d.data.outlet.audience_size > 0)
      .append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#6b7280')
      .attr('opacity', d => {
        if (!highlightedOwner) return 0.8;
        const isHighlighted = d.data.outlet && d.data.outlet.owner === highlightedOwner;
        return isHighlighted ? 1 : 0.3;
      })
      .text(d => {
        if (d.data.outlet) {
          const size = d.data.outlet.audience_size;
          if (size >= 1000000000) return `${(size / 1000000000).toFixed(1)}B`;
          if (size >= 1000000) return `${(size / 1000000).toFixed(1)}M`;
          return `${(size / 1000).toFixed(0)}K`;
        }
        return '';
      });

    // Update SVG height dynamically
    svg.attr('height', height + margin.top + margin.bottom);

  }, [data, highlightedOwner, onOwnerHover, expandedNodes]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Ownership Structure</h3>
        <div className="text-sm text-gray-600">
          <span className="mr-4">Click owner nodes to expand/collapse</span>
          <button
            onClick={() => setExpandedNodes(new Set())}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium transition-colors"
          >
            Collapse All
          </button>
          <button
            onClick={() => setExpandedNodes(new Set(data.map(d => d.id)))}
            className="ml-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-xs font-medium transition-colors"
          >
            Expand All
          </button>
        </div>
      </div>
      <div className="overflow-auto max-h-[700px]">
        <svg
          ref={svgRef}
          width="1000"
          height="600"
          className="w-full"
        />
      </div>
    </div>
  );
};