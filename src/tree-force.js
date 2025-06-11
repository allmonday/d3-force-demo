// 基本的 d3.js 树状 force 图数据和渲染逻辑
import * as d3 from "d3";

// 画布尺寸，初始为窗口大小
let width = window.innerWidth;
let height = window.innerHeight;

// 示例：环状结构数据（非树）
const data2 = {
  nodes: [
    { id: "A", label: "A", value: 1 },
    { id: "B", label: "B", value: 2 },
    { id: "C", label: "C", value: 3 },
    { id: "D", label: "D", value: 4 },
    { id: "E", label: "E", value: 5 },
    { id: "F", label: "F", value: 6 },
    { id: "G", label: "G", value: 7 },
  ],
  links: [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "D" },
    { source: "D", target: "A" },
    { source: "D", target: "F" },
    { source: "D", target: "E" },
    { source: "F", target: "G" },
  ],
};

const nodes = data2.nodes;
const links = data2.links;

const simulation = d3
  .forceSimulation(nodes)
  .force(
    "link",
    d3
      .forceLink(links)
      .distance(120)
      .strength(1)
      .id((d) => d.id)
  )
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2));

// 创建 svg 元素，并添加整体拖拽（平移视图）功能
const svg = d3
  .select("#app")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("display", "block") // 去除默认间隙
  .style("position", "fixed") // 让 svg 覆盖整个页面
  .style("top", 0)
  .style("left", 0)
  // 修正：初始化 viewBox，避免缩放后点击拖拽导致 size 突变
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("viewBox-x", 0)
  .attr("viewBox-y", 0)
  // svg 拖拽平移
  .call(
    d3
      .drag()
      .on("start", function (event) {
        // 拖拽时鼠标变为手型
        svg.style("cursor", "grabbing");
        // 记录 svg 拖拽起始位置
        // 修正：拖拽时读取当前 viewBox 的宽高，避免突变
        const vb = (svg.attr("viewBox") || `0 0 ${width} ${height}`)
          .split(" ")
          .map(Number);
        svg.attr("data-drag-x", event.x).attr("data-drag-y", event.y);
        svg.attr("data-origin-x", vb[0]).attr("data-origin-y", vb[1]);
        svg.attr("data-origin-width", vb[2]).attr("data-origin-height", vb[3]);
      })
      .on("drag", function (event) {
        // 计算 svg 拖拽偏移，实现 viewBox 平移
        // 鼠标移动多少，viewBox 就移动多少（缩放时需同步缩放比）
        let scale = svg.node().width.baseVal.value / (+svg.attr("viewBox")?.split(" ")[2] || width);
        let dx = (event.x - +svg.attr("data-drag-x")) / scale;
        let dy = (event.y - +svg.attr("data-drag-y")) / scale;
        let ox = +svg.attr("data-origin-x") || 0;
        let oy = +svg.attr("data-origin-y") || 0;
        let ow = +svg.attr("data-origin-width") || width;
        let oh = +svg.attr("data-origin-height") || height;
        svg
          .attr("viewBox", `${ox - dx} ${oy - dy} ${ow} ${oh}`)
          .attr("viewBox-x", ox - dx)
          .attr("viewBox-y", oy - dy);
      })
      .on("end", function () {
        // 拖拽结束恢复鼠标样式
        svg.style("cursor", "grab");
      })
  )
  .style("cursor", "grab"); // 默认鼠标为抓手

// 绘制连线（箭头放在中间）
const link = svg
  .append("g")
  .attr("stroke", "#999")
  .attr("stroke-opacity", 0.6)
  .selectAll("line")
  .data(links)
  .join("line")
  .attr("stroke-width", 2);

// 绘制中间箭头
const arrows = svg.append("g")
  .selectAll("path")
  .data(links)
  .join("path")
  .attr("fill", "#999");

// 绘制节点
const node = svg
  .append("g")
  .attr("stroke", "#fff")
  .attr("stroke-width", 1.5)
  .selectAll("circle")
  .data(nodes)
  .join("circle")
  .attr("r", 20)
  .attr("fill", "#69b3a2")
  .call(drag(simulation));

// 绘制节点标签
const label = svg
  .append("g")
  .selectAll("text")
  .data(nodes)
  .join("text")
  .attr("text-anchor", "middle")
  .attr("dy", 4)
  .attr("font-size", "10px")
  .text((d) => d.label || d.id);

// 让 label 也能点击，显示 json 数据到侧边栏
label
  .style("pointer-events", "auto")
  .style("cursor", "pointer")
  .on("click", (event, d) => {
    sidebar.style("display", "block");
    sidebar.selectAll("pre").remove();
    sidebar
      .append("pre")
      .style("margin-top", "48px")
      .style("font-size", "16px")
      .style("line-height", "1.5")
      .style("white-space", "pre-wrap")
      .text(JSON.stringify(d, null, 2));
  });

function showSidebar(d) {
  sidebar.style("display", "block");
  sidebar.selectAll("pre").remove();
  sidebar
    .append("pre")
    .style("margin-top", "48px")
    .style("font-size", "16px")
    .style("line-height", "1.5")
    .style("white-space", "pre-wrap")
    .text(JSON.stringify(d, null, 2));
}

node.on("click", (event, d) => {
  event.stopPropagation();
  showSidebar(d);
});
label.on("click", (event, d) => {
  event.stopPropagation();
  showSidebar(d);
});

// 力仿真每次迭代时更新节点和连线位置
simulation.on("tick", () => {
  link
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);

  // 箭头放在连线中点
  arrows.attr("d", d => {
    const x1 = d.source.x, y1 = d.source.y;
    const x2 = d.target.x, y2 = d.target.y;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    // 计算箭头朝向
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ux = dx / len;
    const uy = dy / len;
    // 箭头大小
    const size = 10;
    // 箭头三点
    const ax = mx - uy * size / 2;
    const ay = my + ux * size / 2;
    const bx = mx + uy * size / 2;
    const by = my - ux * size / 2;
    const cx = mx + ux * size;
    const cy = my + uy * size;
    return `M${ax},${ay}L${cx},${cy}L${bx},${by}Z`;
  });

  node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

  label.attr("x", (d) => d.x).attr("y", (d) => d.y);
});

// 节点拖拽行为，支持节点单独拖动
function drag(simulation) {
  // 拖拽开始
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart(); // 激活仿真
    d.fx = d.x; // 固定节点位置
    d.fy = d.y;
  }
  // 拖拽中
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  // 拖拽结束
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0); // 停止仿真
    d.fx = null; // 释放节点
    d.fy = null;
  }
  // 返回 d3 拖拽行为
  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// 当前缩放比例，初始为 1
let zoomScale = 1;

// 监听滚轮事件，实现缩放（以鼠标指针为缩放中心）
svg.on("wheel", function (event) {
  event.preventDefault();
  const [mouseX, mouseY] = d3.pointer(event);
  const scaleStep = 0.1;
  const minScale = 0.2;
  const maxScale = 5;
  let newZoomScale = zoomScale;
  if (event.deltaY < 0) {
    newZoomScale = Math.min(zoomScale + scaleStep, maxScale);
  } else {
    newZoomScale = Math.max(zoomScale - scaleStep, minScale);
  }
  if (newZoomScale === zoomScale) return;
  // 获取当前 viewBox
  let ox = +svg.attr("viewBox-x") || 0;
  let oy = +svg.attr("viewBox-y") || 0;
  let vbWidth = width / zoomScale;
  let vbHeight = height / zoomScale;
  // 鼠标在 viewBox 中的坐标
  let mx = ox + (mouseX * vbWidth) / width;
  let my = oy + (mouseY * vbHeight) / height;
  // 新 viewBox 尺寸
  let newVbWidth = width / newZoomScale;
  let newVbHeight = height / newZoomScale;
  // 保持鼠标指针下的内容缩放前后位置一致
  let newOx = mx - (mouseX / width) * newVbWidth;
  let newOy = my - (mouseY / height) * newVbHeight;
  svg.attr("viewBox", `${newOx} ${newOy} ${newVbWidth} ${newVbHeight}`);
  svg.attr("viewBox-x", newOx);
  svg.attr("viewBox-y", newOy);
  zoomScale = newZoomScale;
});

// 监听窗口大小变化，自动调整 svg 尺寸和力仿真中心
window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  svg.attr("width", width).attr("height", height);
  simulation.force("center", d3.forceCenter(width / 2, height / 2));
  // 若有 viewBox 平移，保持 viewBox 大小同步
  const ox = +svg.attr("viewBox-x") || 0;
  const oy = +svg.attr("viewBox-y") || 0;
  svg.attr("viewBox", `${ox} ${oy} ${width} ${height}`);
});

// 在 body 末尾插入侧边栏容器
const sidebar = d3
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
sidebar
  .append("button")
  .text("关闭")
  .style("position", "absolute")
  .style("top", "16px")
  .style("right", "16px")
  .on("click", () => sidebar.style("display", "none"));

// 节点点击事件，显示 json 数据到侧边栏
node.on("click", (event, d) => {
  sidebar.style("display", "block");
  sidebar.selectAll("pre").remove();
  sidebar
    .append("pre")
    .style("margin-top", "48px")
    .style("font-size", "16px")
    .style("line-height", "1.5")
    .style("white-space", "pre-wrap")
    .text(JSON.stringify(d.data, null, 2));
});
