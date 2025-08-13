// 基本的 d3.js 树状 force 图数据和渲染逻辑
import * as d3 from "d3";

// 定义数据接口
export interface NodeData {
    id: string;
    label?: string;
    value?: number;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

export interface LinkData {
    source: string | NodeData;
    target: string | NodeData;
}

export interface GraphData {
    nodes: NodeData[];
    links: LinkData[];
}

export class ForceTree {
    private width: number;
    private height: number;
    private zoomScale: number;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null;
    private simulation: d3.Simulation<NodeData, undefined> | null;
    private nodes: NodeData[];
    private links: LinkData[];
    private sidebar: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null;
    private link: any;
    private arrows: any;
    private node: any;
    private label: any;

    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.zoomScale = 1;
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.sidebar = null;
        this.link = null;
        this.arrows = null;
        this.node = null;
        this.label = null;
    }

    public create(data: GraphData): void {
        this.nodes = data.nodes;
        this.links = data.links;

        this.initSimulation();
        this.initSvg();
        this.initSidebar();
        this.renderElements();
        this.bindEvents();
    }

    private initSimulation(): void {
        this.simulation = d3
            .forceSimulation(this.nodes)
            .force(
                "link",
                d3
                    .forceLink<NodeData, LinkData>(this.links)
                    .distance(120)
                    .strength(1)
                    .id((d: NodeData) => d.id)
            )
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2));
    }

    private initSvg(): void {
        this.svg = d3
            .select("#app")
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .style("display", "block")
            .style("position", "fixed")
            .style("top", 0)
            .style("left", 0)
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("viewBox-x", 0)
            .attr("viewBox-y", 0)
            .call(this.createDragBehavior())
            .style("cursor", "grab");
    }

    private initSidebar(): void {
        this.sidebar = d3
            .select("body")
            .append("div")
            .attr("id", "sidebar")
            .style("position", "fixed")
            .style("top", "0")
            .style("right", "0")
            .style("width", "400px")
            .style("height", "100vh")
            .style("background", "#fff")
            .style("box-shadow", "-2px 0 8px rgba(0,0,0,0.08)")
            .style("padding", "24px")
            .style("overflow", "auto")
            .style("display", "none")
            .style("z-index", 1000);

        // 侧边栏关闭按钮
        this.sidebar
            .append("button")
            .text("关闭")
            .style("position", "absolute")
            .style("top", "16px")
            .style("right", "16px")
            .on("click", () => this.sidebar?.style("display", "none"));
    }

    private renderElements(): void {
        if (!this.svg) return;

        // 绘制连线
        this.link = this.svg
            .append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(this.links)
            .join("line")
            .attr("stroke-width", 2);

        // 绘制箭头
        this.arrows = this.svg
            .append("g")
            .selectAll("path")
            .data(this.links)
            .join("path")
            .attr("fill", "#999");

        // 绘制节点
        this.node = this.svg
            .append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(this.nodes)
            .join("circle")
            .attr("r", 20)
            .attr("fill", "#69b3a2")
            .call(this.createNodeDragBehavior() as any);

        // 绘制标签
        this.label = this.svg
            .append("g")
            .selectAll("text")
            .data(this.nodes)
            .join("text")
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("font-size", "10px")
            .text((d: NodeData) => d.label || d.id);
    }

    private bindEvents(): void {
        if (!this.node || !this.label || !this.simulation || !this.svg) return;

        // 节点和标签点击事件
        this.node.on("click", (event: MouseEvent, d: NodeData) => {
            event.stopPropagation();
            this.showSidebar(d);
        });

        this.label.on("click", (event: MouseEvent, d: NodeData) => {
            event.stopPropagation();
            this.showSidebar(d);
        });

        // 力仿真更新
        this.simulation.on("tick", () => this.updatePositions());

        // 滚轮缩放
        this.svg.on("wheel", (event: WheelEvent) => this.handleWheel(event));

        // 窗口大小变化
        window.addEventListener("resize", () => this.handleResize());
    }

    private createDragBehavior() {
        return d3
            .drag<SVGSVGElement, unknown>()
            .on("start", (event: any) => {
                if (!this.svg) return;
                this.svg.style("cursor", "grabbing");
                const vb = (this.svg.attr("viewBox") || `0 0 ${this.width} ${this.height}`)
                    .split(" ")
                    .map(Number);
                this.svg.attr("data-drag-x", event.x).attr("data-drag-y", event.y);
                this.svg.attr("data-origin-x", vb[0]).attr("data-origin-y", vb[1]);
                this.svg
                    .attr("data-origin-width", vb[2])
                    .attr("data-origin-height", vb[3]);
            })
            .on("drag", (event: any) => {
                if (!this.svg) return;
                const scale =
                    this.svg.node()!.width.baseVal.value /
                    (+(this.svg.attr("viewBox")?.split(" ")[2] || this.width));
                const dx = (event.x - +(this.svg.attr("data-drag-x") || 0)) / scale;
                const dy = (event.y - +(this.svg.attr("data-drag-y") || 0)) / scale;
                const ox = +(this.svg.attr("data-origin-x") || 0);
                const oy = +(this.svg.attr("data-origin-y") || 0);
                const ow = +(this.svg.attr("data-origin-width") || this.width);
                const oh = +(this.svg.attr("data-origin-height") || this.height);
                this.svg
                    .attr("viewBox", `${ox - dx} ${oy - dy} ${ow} ${oh}`)
                    .attr("viewBox-x", ox - dx)
                    .attr("viewBox-y", oy - dy);
            })
            .on("end", () => {
                if (!this.svg) return;
                this.svg.style("cursor", "grab");
            });
    }

    private createNodeDragBehavior() {
        const dragstarted = (event: any, d: any) => {
            if (!this.simulation) return;
            if (!event.active) this.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        };

        const dragged = (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
        };

        const dragended = (event: any, d: any) => {
            if (!this.simulation) return;
            if (!event.active) this.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        };

        return d3
            .drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    private showSidebar(d: NodeData): void {
        if (!this.sidebar) return;
        this.sidebar.style("display", "block");
        this.sidebar.selectAll("pre").remove();
        this.sidebar
            .append("pre")
            .style("margin-top", "48px")
            .style("font-size", "16px")
            .style("line-height", "1.5")
            .style("white-space", "pre-wrap")
            .text(JSON.stringify(d, null, 2));
    }

    private updatePositions(): void {
        if (!this.link || !this.arrows || !this.node || !this.label) return;

        this.link
            .attr("x1", (d: LinkData) => (d.source as NodeData).x || 0)
            .attr("y1", (d: LinkData) => (d.source as NodeData).y || 0)
            .attr("x2", (d: LinkData) => (d.target as NodeData).x || 0)
            .attr("y2", (d: LinkData) => (d.target as NodeData).y || 0);

        this.arrows.attr("d", (d: LinkData) => {
            const source = d.source as NodeData;
            const target = d.target as NodeData;
            const x1 = source.x || 0;
            const y1 = source.y || 0;
            const x2 = target.x || 0;
            const y2 = target.y || 0;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / len;
            const uy = dy / len;
            const size = 10;
            const ax = mx - (uy * size) / 2;
            const ay = my + (ux * size) / 2;
            const bx = mx + (uy * size) / 2;
            const by = my - (ux * size) / 2;
            const cx = mx + ux * size;
            const cy = my + uy * size;
            return `M${ax},${ay}L${cx},${cy}L${bx},${by}Z`;
        });

        this.node.attr("cx", (d: NodeData) => d.x || 0).attr("cy", (d: NodeData) => d.y || 0);
        this.label.attr("x", (d: NodeData) => d.x || 0).attr("y", (d: NodeData) => d.y || 0);
    }

    private handleWheel(event: WheelEvent): void {
        if (!this.svg) return;
        event.preventDefault();
        const [mouseX, mouseY] = d3.pointer(event, this.svg.node());
        const scaleStep = 0.1;
        const minScale = 0.2;
        const maxScale = 5;
        let newZoomScale = this.zoomScale;

        if (event.deltaY < 0) {
            newZoomScale = Math.min(this.zoomScale + scaleStep, maxScale);
        } else {
            newZoomScale = Math.max(this.zoomScale - scaleStep, minScale);
        }

        if (newZoomScale === this.zoomScale) return;

        const ox = +(this.svg.attr("viewBox-x") || 0);
        const oy = +(this.svg.attr("viewBox-y") || 0);
        const vbWidth = this.width / this.zoomScale;
        const vbHeight = this.height / this.zoomScale;
        const mx = ox + (mouseX * vbWidth) / this.width;
        const my = oy + (mouseY * vbHeight) / this.height;
        const newVbWidth = this.width / newZoomScale;
        const newVbHeight = this.height / newZoomScale;
        const newOx = mx - (mouseX / this.width) * newVbWidth;
        const newOy = my - (mouseY / this.height) * newVbHeight;

        this.svg.attr("viewBox", `${newOx} ${newOy} ${newVbWidth} ${newVbHeight}`);
        this.svg.attr("viewBox-x", newOx);
        this.svg.attr("viewBox-y", newOy);
        this.zoomScale = newZoomScale;
    }

    private handleResize(): void {
        if (!this.svg || !this.simulation) return;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.svg.attr("width", this.width).attr("height", this.height);
        this.simulation.force("center", d3.forceCenter(this.width / 2, this.height / 2));
        const ox = +(this.svg.attr("viewBox-x") || 0);
        const oy = +(this.svg.attr("viewBox-y") || 0);
        this.svg.attr("viewBox", `${ox} ${oy} ${this.width} ${this.height}`);
    }
}
