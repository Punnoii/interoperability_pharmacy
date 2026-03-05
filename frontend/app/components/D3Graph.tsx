/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface D3GraphProps {
    data: any;
    width?: number;
    height?: number;
}

export default function D3Graph({ data, width = 800, height = 600 }: D3GraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!data || !data.results || !data.results.bindings || data.results.bindings.length === 0) {
            return;
        }

        const vars = data.head.vars;
        if (vars.length < 2) return; // Need at least 2 variables to link nodes

        // Process data
        const nodesMap = new Map();
        const links: any[] = [];

        data.results.bindings.forEach((binding: any) => {
            const sourceId = binding[vars[0]]?.value;
            const targetId = binding[vars[vars.length - 1]]?.value;
            const labelText = vars.length > 2 ? binding[vars[1]]?.value : '';

            if (sourceId && targetId) {
                if (!nodesMap.has(sourceId)) {
                    nodesMap.set(sourceId, { id: sourceId, label: sourceId.split(/[/#]/).pop() || sourceId });
                }
                if (!nodesMap.has(targetId)) {
                    nodesMap.set(targetId, { id: targetId, label: targetId.split(/[/#]/).pop() || targetId });
                }

                links.push({
                    source: sourceId,
                    target: targetId,
                    label: labelText.split(/[/#]/).pop() || labelText
                });
            }
        });

        const nodesData = Array.from(nodesMap.values());
        const linksData = links;

        const currentWidth = wrapperRef.current?.clientWidth || width;
        const currentHeight = wrapperRef.current?.clientHeight || height;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // Clear previous rendering

        const g = svg.append('g');

        // Setup Zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom as any);

        // Simulation
        const simulation = d3.forceSimulation(nodesData as d3.SimulationNodeDatum[])
            .force('link', d3.forceLink(linksData).id((d: any) => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(currentWidth / 2, currentHeight / 2))
            .force('collide', d3.forceCollide().radius(30));

        // Arrow marker
        svg.append('defs').append('marker')
            .attr('id', 'arrowtail')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 22)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');

        const link = g.append('g')
            .selectAll('g')
            .data(linksData)
            .enter().append('g');

        const path = link.append('path')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrowtail)');

        const linkLabels = link.append('text')
            .attr('font-size', '10px')
            .attr('fill', '#555')
            .attr('text-anchor', 'middle')
            .attr('dy', -5)
            .text(d => d.label);

        const node = g.append('g')
            .selectAll('g')
            .data(nodesData)
            .enter().append('g')
            .call(d3.drag<SVGGElement, any>()
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
                }) as any);

        node.append('circle')
            .attr('r', 16)
            .attr('fill', '#2196f3')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', function () { d3.select(this).attr('stroke', '#333'); })
            .on('mouseout', function () { d3.select(this).attr('stroke', '#fff'); });

        node.append('text')
            .attr('dx', 20)
            .attr('dy', 4)
            .attr('font-size', '12px')
            .attr('font-family', 'sans-serif')
            .attr('fill', '#333')
            .style('pointer-events', 'none')
            .text((d: any) => d.label);

        node.append('title')
            .text((d: any) => d.id);

        simulation.on('tick', () => {
            path.attr('d', (d: any) => {
                const dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });

            linkLabels
                .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
                .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

            node.attr('transform', (d: any) => `translate(${Math.max(20, Math.min(currentWidth - 20, d.x))},${Math.max(20, Math.min(currentHeight - 20, d.y))})`);
        });

        return () => {
            simulation.stop();
        };
    }, [data, width, height]);

    return (
        <div ref={wrapperRef} style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
        </div>
    );
}
