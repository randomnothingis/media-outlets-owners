import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MediaOutlet } from '../types';

interface TimelineProps {
  data: MediaOutlet[];
  highlightedOwner?: string;
  onOwnerHover: (owner: string | undefined) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ data, highlightedOwner, onOwnerHover }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 60, right: 60, bottom: 80, left: 200 }; // Increased left margin for labels
    const width = 1200 - margin.left - margin.right;
    const height = Math.max(600, data.length * 25) - margin.bottom - margin.top; // Dynamic height

    // Sort data by founding year for consecutive timeline
    const sortedData = [...data].sort((a, b) => b.founding_year - a.founding_year);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Time scale
    const minYear = d3.min(sortedData, d => d.founding_year) || 1800;
    const maxYear = d3.max(sortedData, d => d.end_year || 2024) || 2024;
    
    const xScale = d3.scaleLinear()
      .domain([minYear - 10, maxYear + 10])
      .range([0, width]);

    // Y scale for outlets - using sorted data
    const yScale = d3.scaleBand()
      .domain(sortedData.map(d => d.outlet))
      .range([0, height])
      .padding(0.15);

    // Color scale for owners
    const ownerColors = d3.scaleOrdinal(d3.schemeDark2)
      .domain([...new Set(sortedData.map(d => d.owner))]);

    // Add timeline bars
    const bars = g.selectAll('.timeline-bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'timeline-bar')
      .attr('x', d => xScale(d.founding_year))
      .attr('y', d => yScale(d.outlet)!)
      .attr('width', d => xScale(d.end_year || 2025) - xScale(d.founding_year))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => ownerColors(d.owner))
      .attr('opacity', d => highlightedOwner && highlightedOwner !== d.owner ? 0.3 : 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('rx', 10) // Rounded corners
      .on('mouseover', function(event, d) {
        onOwnerHover(d.owner);
        d3.select(this).attr('opacity', 1);
        
        // Show tooltip
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
          .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">${d.outlet}</div>
          <div>Owner: ${d.owner}</div>
          <div>Founded: ${d.founding_year}</div>
          ${d.end_year ? `<div>Ended: ${d.end_year}</div>` : '<div>Status: Active</div>'}
          <div>Audience: ${d.audience_size ? d.audience_size.toLocaleString() : 'N/A'}</div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        onOwnerHover(undefined);
        d3.select(this).attr('opacity', 0.8);
        d3.selectAll('.tooltip').remove();
      })
      .style('cursor', 'pointer');

    // Add outlet labels with better text handling
    g.selectAll('.outlet-label')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'outlet-label')
      .attr('x', -15)
      .attr('y', d => yScale(d.outlet)! + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#374151')
      .attr('opacity', d => highlightedOwner && highlightedOwner !== d.owner ? 0.4 : 1)
      .text(d => {
        // Truncate long outlet names
        const maxLength = 25;
        return d.outlet.length > maxLength ? d.outlet.substring(0, maxLength) + '...' : d.outlet;
      })
      .append('title') // Add full name as tooltip
      .text(d => d.outlet);

    // Add founding year labels on bars
    g.selectAll('.year-label')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'year-label')
      .attr('x', d => xScale(d.founding_year) + 5)
      .attr('y', d => yScale(d.outlet)! + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('opacity', d => highlightedOwner && highlightedOwner !== d.owner ? 0.4 : 0.9)
      .text(d => d.founding_year);

    // Add x-axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => d.toString())
      .ticks(Math.min(10, Math.floor(width / 80))); // Responsive tick count

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280');

    // Add axis labels
    g.append('text')
      .attr('transform', `translate(${width/2},${height + 50})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Year');

    // Add legend with better spacing and text handling
    const legend = g.append('g')
      .attr('transform', `translate(${width - 250}, -40)`);

    const owners = [...new Set(sortedData.map(d => d.owner))];
    const legendItems = legend.selectAll('.legend-item')
      .data(owners.slice(0, 8)) // Show more items
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(${Math.floor(i / 4) * 130}, ${(i % 4) * 18})`) // Two columns
      .on('mouseover', (event, d) => onOwnerHover(d))
      .on('mouseout', () => onOwnerHover(undefined))
      .style('cursor', 'pointer');

    legendItems.append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', d => ownerColors(d))
      .attr('opacity', d => highlightedOwner && highlightedOwner !== d ? 0.3 : 0.8);
    
    legendItems.append('text')
      .attr('x', 16)
      .attr('y', 6)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', '#374151')
      .attr('opacity', d => highlightedOwner && highlightedOwner !== d ? 0.4 : 1)
      .text(d => {
        const maxLength = 12;
        return d.length > maxLength ? d.substring(0, maxLength) + '...' : d;
      })
      .append('title')
      .text(d => d);

    // Update SVG height to accommodate content
    svg.attr('height', height + margin.top + margin.bottom);

  }, [data, highlightedOwner, onOwnerHover]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Media Outlet Timeline (Sorted by Founding Year)</h3>
      <div className="overflow-auto max-h-[600px]">
        <svg
          ref={svgRef}
          width="auto"
          height="600"
          className="w-full"
        />
      </div>
    </div>
  );
};