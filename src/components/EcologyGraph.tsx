import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MemoryState } from '../gemini';

interface NetworkGraphProps {
  memory: MemoryState;
  width?: number;
  height?: number;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: string;
  radius: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export const EcologyGraph: React.FC<NetworkGraphProps> = ({ memory, width = 600, height = 400 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear old graph
    d3.select(svgRef.current).selectAll('*').remove();

    const nodes: Node[] = [];
    const links: Link[] = [];

    // Central Node: The Mind
    nodes.push({ id: 'Ecology of Mind', group: 'core', radius: 40 });

    const addNodesAndLinks = (items: string[], groupName: string, radius: number) => {
      // De-duplicate items for visualization
      const uniqueItems = Array.from(new Set(items));
      uniqueItems.forEach(item => {
        // limit label length
        const label = item.length > 25 ? item.substring(0, 25) + '...' : item;
        const exists = nodes.find(n => n.id === label);
        if (!exists) {
          nodes.push({ id: label, group: groupName, radius });
          links.push({ source: 'Ecology of Mind', target: label });
        }
      });
    };

    addNodesAndLinks(memory.long_term_themes, 'theme', 25);
    addNodesAndLinks(memory.recurring_patterns, 'pattern', 20);
    addNodesAndLinks(memory.contextual_motifs, 'motif', 15);
    addNodesAndLinks(memory.double_binds_detected, 'bind', 22);

    if (nodes.length === 1) {
       // Only the center node, nothing to draw really, but let's draw it anyway
       nodes[0].x = width / 2;
       nodes[0].y = height / 2;
    }

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    const color = d3.scaleOrdinal()
      .domain(['core', 'theme', 'pattern', 'motif', 'bind'])
      .range(['#5a5a40', '#8b8b6d', '#A1A186', '#C7C7B3', '#D68953']); // Organic palette

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => (d as Node).radius + 5).iterations(2));

    const link = svg.append('g')
      .attr('stroke', '#e0e0d5')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.5);

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => color(d.group) as string)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    node.append('text')
      .text(d => d.id)
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', 'Cormorant Garamond, serif')
      .style('font-size', d => d.group === 'core' ? '14px' : '10px')
      .style('fill', d => d.group === 'core' ? '#fff' : '#2c2c2c')
      .style('pointer-events', 'none')
      // simple text shadow for legibility
      .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)');

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [memory, width, height]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
};
