// 基本的 d3.js 树状 force 图数据和渲染逻辑
import * as d3 from "d3";

export class ForceTree {
  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.zoomScale = 1;
    this.svg = null;
    this.simulation = null;
    this.nodes = null;
    this.links = null;
    this.sidebar = null;
  }

  create(data) {
    this.nodes = data.nodes;
    this.links = data.links;

    this.initSimulation();
    this.initSvg();
    this.initSidebar();
    this.renderElements();
    this.bindEvents();
  }

  initSimulation() {
    this.simulation = d3
      .forceSimulation(this.nodes)
      .force(
        "link",
        d3
          .forceLink(this.links)
          .distance(120)
          .strength(1)
          .id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2));
  }

  initSvg() {
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

  initSidebar() {
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
      .on("click", () => this.sidebar.style("display", "none"));
  }

  renderElements() {
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
      .call(this.createNodeDragBehavior());

    // 绘制标签
    this.label = this.svg
      .append("g")
      .selectAll("text")
      .data(this.nodes)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", "10px")
      .text((d) => d.label || d.id);
  }

  bindEvents() {
    // 节点和标签点击事件
    this.node.on("click", (event, d) => {
      event.stopPropagation();
      this.showSidebar(d);
    });

    this.label.on("click", (event, d) => {
      event.stopPropagation();
      this.showSidebar(d);
    });

    // 力仿真更新
    this.simulation.on("tick", () => this.updatePositions());

    // 滚轮缩放
    this.svg.on("wheel", (event) => this.handleWheel(event));

    // 窗口大小变化
    window.addEventListener("resize", () => this.handleResize());
  }

  createDragBehavior() {
    return d3
      .drag()
      .on("start", (event) => {
        this.svg.style("cursor", "grabbing");
        const vb = (
          this.svg.attr("viewBox") || `0 0 ${this.width} ${this.height}`
        )
          .split(" ")
          .map(Number);
        this.svg.attr("data-drag-x", event.x).attr("data-drag-y", event.y);
        this.svg.attr("data-origin-x", vb[0]).attr("data-origin-y", vb[1]);
        this.svg
          .attr("data-origin-width", vb[2])
          .attr("data-origin-height", vb[3]);
      })
      .on("drag", (event) => {
        let scale =
          this.svg.node().width.baseVal.value /
          (+this.svg.attr("viewBox")?.split(" ")[2] || this.width);
        let dx = (event.x - +this.svg.attr("data-drag-x")) / scale;
        let dy = (event.y - +this.svg.attr("data-drag-y")) / scale;
        let ox = +this.svg.attr("data-origin-x") || 0;
        let oy = +this.svg.attr("data-origin-y") || 0;
        let ow = +this.svg.attr("data-origin-width") || this.width;
        let oh = +this.svg.attr("data-origin-height") || this.height;
        this.svg
          .attr("viewBox", `${ox - dx} ${oy - dy} ${ow} ${oh}`)
          .attr("viewBox-x", ox - dx)
          .attr("viewBox-y", oy - dy);
      })
      .on("end", () => {
        this.svg.style("cursor", "grab");
      });
  }

  createNodeDragBehavior() {
    const dragstarted = (event, d) => {
      if (!event.active) this.simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    };

    const dragged = (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    };

    const dragended = (event, d) => {
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

  showSidebar(d) {
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

  updatePositions() {
    this.link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    this.arrows.attr("d", (d) => {
      const x1 = d.source.x,
        y1 = d.source.y;
      const x2 = d.target.x,
        y2 = d.target.y;
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

    this.node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    this.label.attr("x", (d) => d.x).attr("y", (d) => d.y);
  }

  handleWheel(event) {
    event.preventDefault();
    const [mouseX, mouseY] = d3.pointer(event);
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

    let ox = +this.svg.attr("viewBox-x") || 0;
    let oy = +this.svg.attr("viewBox-y") || 0;
    let vbWidth = this.width / this.zoomScale;
    let vbHeight = this.height / this.zoomScale;
    let mx = ox + (mouseX * vbWidth) / this.width;
    let my = oy + (mouseY * vbHeight) / this.height;
    let newVbWidth = this.width / newZoomScale;
    let newVbHeight = this.height / newZoomScale;
    let newOx = mx - (mouseX / this.width) * newVbWidth;
    let newOy = my - (mouseY / this.height) * newVbHeight;

    this.svg.attr("viewBox", `${newOx} ${newOy} ${newVbWidth} ${newVbHeight}`);
    this.svg.attr("viewBox-x", newOx);
    this.svg.attr("viewBox-y", newOy);
    this.zoomScale = newZoomScale;
  }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.svg.attr("width", this.width).attr("height", this.height);
    this.simulation.force(
      "center",
      d3.forceCenter(this.width / 2, this.height / 2)
    );
    const ox = +this.svg.attr("viewBox-x") || 0;
    const oy = +this.svg.attr("viewBox-y") || 0;
    this.svg.attr("viewBox", `${ox} ${oy} ${this.width} ${this.height}`);
  }
}
