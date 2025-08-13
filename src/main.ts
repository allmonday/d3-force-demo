import "./style.css";
import { ForceTree, type GraphData } from "./tree-force";

// 示例：环状结构数据（非树）
const data: GraphData = {
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

// 创建 ForceTree 实例并调用 create 方法
const forceTree = new ForceTree();
forceTree.create(data);
