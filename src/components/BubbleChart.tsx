import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MediaOutlet } from '../types';

interface BubbleChartProps {
  data: MediaOutlet[];
  highlightedOwner?: string;
  onOwnerHover: (owner: string | undefined) => void;
}

export const BubbleChart: React.FC<BubbleChartProps> = ({ data, highlightedOwner, onOwnerHover }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 60, right: 60, bottom: 80, left: 200 }; // Increased left margin for labels
    const width = window.innerWidth*0.6 - margin.left - margin.right;
    const height = Math.max(window.innerHeight*0.6, data.length * 25) - margin.bottom - margin.top; // Dynamic height

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Filter out data with missing audience size for better visualization
    const validData = data.filter(d => d.audience_size > 0);

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(validData, d => d.founding_year) as [number, number])
      .range([0, width - margin.left - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(validData, d => d.audience_size) || 0])
      .range([height - margin.top - margin.bottom, 0]);

    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(validData, d => d.audience_size) || 0])
      .range([8, 60]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain([...new Set(validData.map(d => d.owner))]);

    // Add bubbles
    const bubbles = g.selectAll('.bubble')
      .data(validData)
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .attr('transform', d => `translate(${xScale(d.founding_year)},${yScale(d.audience_size)})`)
      .on('mouseover', function(event, d) {
        onOwnerHover(d.owner);
        
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
          .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
          .style('max-width', '200px');

        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">${d.outlet}</div>
          <div>Owner: ${d.owner}</div>
          <div>Founded: ${d.founding_year}</div>
          <div>Audience: ${d.audience_size.toLocaleString()}</div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        onOwnerHover(undefined);
        d3.selectAll('.tooltip').remove();
      })
      .style('cursor', 'pointer');

    bubbles.append('circle')
      .attr('r', d => radiusScale(d.audience_size))
      .attr('fill', d => colorScale(d.owner))
      .attr('opacity', d => highlightedOwner && highlightedOwner !== d.owner ? 0.3 : 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add outlet labels with better positioning and readability
    bubbles.filter(d => d.audience_size > 1000000) // Only show labels for larger outlets
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => Math.min(12, radiusScale(d.audience_size) / 3)) // Dynamic font size
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('opacity', d => highlightedOwner && highlightedOwner !== d.owner ? 0.3 : 1)
      .attr('pointer-events', 'none')
      .text(d => {
        const name = d.outlet.replace(/^The\s+/i, ''); // Remove "The" prefix
        const radius = radiusScale(d.audience_size);
        const maxLength = Math.floor(radius / 4); // Adjust text length based on bubble size
        return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
      });

    // Add axes with better formatting
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => d.toString())
      .ticks(8);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => {
        const num = d as number;
        if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        return `${(num / 1000).toFixed(0)}K`;
      })
      .ticks(6);

    g.append('g')
      .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280');

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280');

    // Add axis labels
    g.append('text')
      .attr('transform', `translate(${(width - margin.left - margin.right)/2},${height - margin.top - margin.bottom + 60})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Founding Year');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 20)
      .attr('x', 0 - (height - margin.top - margin.bottom) / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Audience Size');

    // // Add legend with better layout
    // const legend = g.append('g')
    //   .attr('transform', `translate(${width - margin.right - 280}, ${height - margin.top - margin.bottom + 20})`);

    // const owners = [...new Set(validData.map(d => d.owner))];
    // const legendItems = legend.selectAll('.legend-item')
    //   .data(owners.slice(0, 8))
    //   .enter()
    //   .append('g')
    //   .attr('class', 'legend-item')
    //   .attr('transform', (d, i) => `translate(${Math.floor(i / 4) * 140}, ${(i % 4) * 18})`)
    //   .on('mouseover', (event, d) => onOwnerHover(d))
    //   .on('mouseout', () => onOwnerHover(undefined))
    //   .style('cursor', 'pointer');

    // legendItems.append('circle')
    //   .attr('r', 6)
    //   .attr('fill', d => colorScale(d))
    //   .attr('opacity', d => highlightedOwner && highlightedOwner !== d ? 0.3 : 0.8);
    
    // legendItems.append('text')
    //   .attr('x', 12)
    //   .attr('y', 0)
    //   .attr('dy', '0.35em')
    //   .attr('font-size', '11px')
    //   .attr('font-weight', '500')
    //   .attr('fill', '#374151')
    //   .attr('opacity', d => highlightedOwner && highlightedOwner !== d ? 0.4 : 1)
    //   .text(d => {
    //     const maxLength = 15;
    //     return d.length > maxLength ? d.substring(0, maxLength) + '...' : d;
    //   })
    //   .append('title')
    //   .text(d => d);

  }, [data, highlightedOwner, onOwnerHover]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Audience Size vs. Founding Year</h3>
      <svg
        ref={svgRef}
        width="900"
        height="650"
        className="w-full h-auto"
      />
    </div>
  );
};