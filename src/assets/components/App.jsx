import React, { useRef, useEffect, useState } from "react";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import "./App.css";

cytoscape.use(coseBilkent);

function App() {
  const cyRef = useRef(null);
  const [selectedView, setSelectedView] = useState("view1");
  const [cyInstance, setCyInstance] = useState(null);
  const [chatInput, setChatInput] = useState("");

  // Color scheme for node types
  const nodeTypeColors = {
    component: "#4CAF50",  // Green
    tool: "#2196F3",       // Blue
    artifact: "#FF9800",   // Orange
    resource: "#9C27B0",   // Purple
    environment: "#607D8B" // Gray-blue
  };

  // Static base data for view1 and view2
  const baseData = {
    view1: [
      { data: { id: "Component_Cart", label: "Component Cart", type: "component" } },
      { data: { id: "ToolA", label: "Tool A", type: "tool" } },
      { data: { source: "Component_Cart", target: "ToolA", label: "tests" } },
      { data: { source: "Component_Cart", target: "ToolA", label: "secures" } },
      { data: { source: "Component_Cart", target: "ToolA", label: "monitors" } },
    ],
    view2: [
      { data: { id: "Component_Cart", label: "Component Cart", type: "component" } },
      { data: { id: "ArtifactDev", label: "Artifact Dev", type: "artifact" } },
      { data: { id: "ResourceLambda", label: "Resource Lambda", type: "resource" } },
      { data: { id: "EnvStage", label: "Environment Stage", type: "environment" } },
      { data: { source: "Component_Cart", target: "ArtifactDev", label: "packaged_as" } },
      { data: { source: "Component_Cart", target: "ResourceLambda", label: "deployed_to" } },
      { data: { source: "Component_Cart", target: "EnvStage", label: "deployed_in" } },
    ],
  };

  const relationMap = {
    view1: ["tests", "secures", "monitors"],
    view2: ["packaged_as", "deployed_to", "deployed_in"],
  };

  const formatLabel = (str) =>
    str
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  // Setup cytoscape instance with color coding
  useEffect(() => {
    const cy = cytoscape({
      container: cyRef.current,
      elements: baseData[selectedView],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#000",
            "text-outline-color": "#fff",
            "text-outline-width": 2,
            width: "label",
            height: "label",
            padding: "12px",
            shape: "roundrectangle",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "font-size": "12px",
            "font-weight": "bold",
            "background-opacity": 0.9,
            "border-width": 1,
            "border-color": "#333",
            "background-color": (ele) => nodeTypeColors[ele.data("type")] || "#61bffc"
          }
        },
        {
          selector: "edge",
          style: {
            label: "data(label)",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#666",
            "target-arrow-color": "#666",
            "font-size": "11px",
            "font-weight": "bold",
            "text-background-color": "#fff",
            "text-background-opacity": 0.9,
            "text-background-padding": "3px",
            "text-margin-y": -5,
            width: 2,
            "edge-text-rotation": "autorotate"
          }
        }
      ],
      layout: {
        name: "cose-bilkent",
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 6500,
        idealEdgeLength: 200,
        edgeElasticity: 0.45,
        gravity: 0.1,
        numIter: 3000
      }
    });

    setCyInstance(cy);
    return () => cy.destroy();
  }, [selectedView]);

  const handleChatSubmit = () => {
    if (!chatInput || !cyInstance) return;

    const msg = chatInput.toLowerCase().trim().replace(/\s+/g, " ");
    const allowedRelations = relationMap[selectedView];
    const regex = new RegExp(
      `component Cart (${allowedRelations.join("|")}) (.+)`,
      "i"
    );
    const match = msg.match(regex);

    if (match) {
      const [_, relation, tgtText] = match;
      const source = "Component_Cart";
      const target = tgtText.replace(/\s/g, "");
      const targetLabel = formatLabel(tgtText);
      const edgeId = `${relation}_${target}`;

      // Determine node type based on view and relation
      let nodeType = "tool";
      if (selectedView === "view2") {
        if (relation === "packaged_as") nodeType = "artifact";
        else if (relation === "deployed_to") nodeType = "resource";
        else if (relation === "deployed_in") nodeType = "environment";
      }

      if (!cyInstance.getElementById(target).length) {
        cyInstance.add({
          group: "nodes",
          data: { 
            id: target, 
            label: targetLabel, 
            type: nodeType 
          },
        });
      }

      if (!cyInstance.getElementById(edgeId).length) {
        cyInstance.add({
          group: "edges",
          data: { id: edgeId, source, target, label: relation },
        });
      }

      cyInstance.layout({
        name: "cose-bilkent",
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 8000,
        idealEdgeLength: 250
      }).run();
      
      setChatInput("");
    } else {
      alert(
        `Invalid format or relation. Use: 'Component Cart <relation> <target>'\nAllowed relations: ${relationMap[
          selectedView
        ].join(", ")}`
      );
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleChatSubmit();
    }
  };

  return (
    <div className="graph-viewer-app">
      <h1>Graph Viewer</h1>

      <select
        onChange={(e) => setSelectedView(e.target.value)}
        value={selectedView}
        className="graph-viewer-select"
      >
        <option value="view1">View 1: Component–Tool</option>
        <option value="view2">View 2: Component–Environment</option>
      </select>

      <div ref={cyRef} className="graph-viewer-canvas" />

      <div className="graph-viewer-controls">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`e.g., Component Cart ${relationMap[selectedView][0]} ${selectedView === "view1" ? "Tool X" : "Artifact X"}`}
          className="graph-viewer-input"
        />
        <button
          onClick={handleChatSubmit}
          className="graph-viewer-button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
