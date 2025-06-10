import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { OwnershipNode } from '../types';

interface RadialTreeProps {
  data: OwnershipNode[];
  highlightedOwner?: string;
  onOwnerHover: (owner: string | undefined) => void;
}

export const RadialTree: React.FC<RadialTreeProps> = ({ data, highlightedOwner, onOwnerHover }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 800;
    const radius = Math.min(width, height) / 2 - 120;

    // Sort data by number of outlets for better radial distribution
    const sortedData = [...data].sort((a, b) => (b.children?.length || 0) - (a.children?.length || 0));

    // Create hierarchy
    const root = d3.hierarchy({
      id: 'root',
      name: 'Media Outlets',
      type: 'root' as const,
      children: sortedData
    });

    // Create radial tree layout
    const tree = d3.tree<any>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    tree(root);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(sortedData.map(d => d.name));

    // Add links with curved paths
    const links = g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkRadial<any, any>()
        .angle(d => d.x)
        .radius(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', d => {
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
      .attr('transform', d => `
        rotate(${(d.x * 180 / Math.PI - 90)}) 
        translate(${d.y},0)
      `)
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
      .style('cursor', 'pointer');

    // Add circles for nodes
    nodes.append('circle')
      .attr('r', d => {
        if (d.data.type === 'root') return 12;
        if (d.data.type === 'owner') return Math.min(25, 8 + (d.children?.length || 0) * 1.5);
        return 6;
      })
      .attr('fill', d => {
        if (d.data.type === 'root') return '#6366f1';
        if (d.data.type === 'owner') return colorScale(d.data.name);
        return d.data.outlet ? colorScale(d.data.outlet.owner) : '#94a3b8';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', d => {
        if (!highlightedOwner) return 1;
        const isHighlighted = d.data.name === highlightedOwner || 
                             (d.data.outlet && d.data.outlet.owner === highlightedOwner);
        return isHighlighted ? 1 : 0.3;
      });

    // Add text labels with smart positioning
    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
      .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .attr('font-size', d => {
        if (d.data.type === 'root') return '14px';
        if (d.data.type === 'owner') return '12px';
        return '10px';
      })
      .attr('font-weight', d => d.data.type === 'owner' ? 'bold' : 'normal')
      .attr('fill', '#374151')
      .attr('opacity', d => {
        if (!highlightedOwner) return 1;
        const isHighlighted = d.data.name === highlightedOwner || 
                             (d.data.outlet && d.data.outlet.owner === highlightedOwner);
        return isHighlighted ? 1 : 0.4;
      })
      .text(d => {
        if (d.data.type === 'root') return 'Media Outlets';
        const name = d.data.name;
        const maxLength = d.data.type === 'owner' ? 20 : 18;
        return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
      })
      .append('title')
      .text(d => d.data.name);

    // Add outlet count for owners
    nodes.filter(d => d.data.type === 'owner')
      .append('text')
      .attr('dy', '1.5em')
      .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
      .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .attr('font-size', '9px')
      .attr('fill', '#6b7280')
      .attr('opacity', d => {
        if (!highlightedOwner) return 0.8;
        return d.data.name === highlightedOwner ? 1 : 0.3;
      })
      .text(d => `${d.children?.length || 0} outlets`);

    // Add audience size for outlets
    nodes.filter(d => d.data.outlet && d.data.outlet.audience_size > 0)
      .append('text')
      .attr('dy', '1.5em')
      .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
      .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .attr('font-size', '8px')
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

    // Add legend in a corner
    // const legend = g.append('g')
    //   .attr('transform', `translate(${-width/2 + 20}, ${-height/2 + 20})`);

    // const owners = [...new Set(sortedData.map(d => d.name))];
    // const legendItems = legend.selectAll('.legend-item')
    //   .data(owners.slice(0, 6))
    //   .enter()
    //   .append('g')
    //   .attr('class', 'legend-item')
    //   .attr('transform', (d, i) => `translate(0, ${i * 20})`)
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
      <h3 className="text-xl font-bold text-gray-800 mb-4">Radial Ownership Structure</h3>
      <div className="flex justify-center">
        <svg
          ref={svgRef}
          width="800"
          height="800"
          className="w-full h-auto max-w-4xl"
        />
      </div>
    </div>
  );
};