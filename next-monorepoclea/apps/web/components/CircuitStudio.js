'use client';

import React, { useState, useEffect, useRef } from 'react';
import ShotSimulator from './ShotSimulator';
import { createBlochSphere } from './three';
import { simulateEnhanced } from './quantumEngine';

const GATE_INFO = {
  H: { name: 'Hadamard (H)', desc: 'Splits state equally between 0 and 1 (50/50 superposition).', matrix: '[[1/√2, 1/√2], [1/√2, -1/√2]]', color: '#00e5a3' },
  X: { name: 'Pauli-X (NOT)', desc: 'Bit flip gate. Flips |0⟩ to |1⟩ and vice versa.', matrix: '[[0, 1], [1, 0]]', color: '#e74c4c' },
  Y: { name: 'Pauli-Y', desc: 'Combined bit and phase flip around the Y-axis.', matrix: '[[0, -i], [i, 0]]', color: '#f5a623' },
  Z: { name: 'Pauli-Z (Phase)', desc: 'Flips quantum phase without altering measurement chances.', matrix: '[[1, 0], [0, -1]]', color: '#7ed321' },
  S: { name: 'Phase Gate (S)', desc: 'Quarter rotation (90°) along the sphere equator.', matrix: '[[1, 0], [0, i]]', color: '#00d2ff' },
  T: { name: 'T Gate (π/8)', desc: 'Eighth rotation (45°) for fine quantum control.', matrix: '[[1, 0], [0, e^(iπ/4)]]', color: '#f8b89e' },
  Rx: { name: 'Rotation-X (Rx)', desc: 'Smoothly tilt the qubit around the X-axis by any chosen angle.', matrix: '[[cos(θ/2), -i sin(θ/2)], [-i sin(θ/2), cos(θ/2)]]', color: '#e74c4c' },
  Ry: { name: 'Rotation-Y (Ry)', desc: 'Smoothly tilt the qubit around the Y-axis by any chosen angle.', matrix: '[[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]]', color: '#f5a623' },
  Rz: { name: 'Rotation-Z (Rz)', desc: 'Smoothly spin the qubit phase around the Z-axis.', matrix: '[[e^(-iθ/2), 0], [0, e^(iθ/2)]]', color: '#7ed321' }
};

const AVAILABLE_GATES = [
  { name: 'H', isParam: false, color: '#00e5a3' },
  { name: 'X', isParam: false, color: '#e74c4c' },
  { name: 'Y', isParam: false, color: '#f5a623' },
  { name: 'Z', isParam: false, color: '#7ed321' },
  { name: 'S', isParam: false, color: '#00d2ff' },
  { name: 'T', isParam: false, color: '#f8b89e' },
  { name: 'Rx', isParam: true, defaultTheta: Math.PI / 2, color: '#e74c4c' },
  { name: 'Ry', isParam: true, defaultTheta: Math.PI / 2, color: '#f5a623' },
  { name: 'Rz', isParam: true, defaultTheta: Math.PI / 2, color: '#7ed321' }
];

const PRESETS = [
  { label: '|0⟩ Ground', gates: [null, null, null, null, null], target: { c0: { re: 1, im: 0 }, c1: { re: 0, im: 0 }, coords: { x: 0, y: 0, z: 1 } } },
  { label: '|+⟩ Superposition', gates: [{ name: 'H', color: '#00e5a3' }, null, null, null, null], target: { c0: { re: 1 / Math.SQRT2, im: 0 }, c1: { re: 1 / Math.SQRT2, im: 0 }, coords: { x: 1, y: 0, z: 0 } } },
  { label: '|+i⟩ Phase State', gates: [{ name: 'H', color: '#00e5a3' }, { name: 'S', color: '#00d2ff' }, null, null, null], target: { c0: { re: 1 / Math.SQRT2, im: 0 }, c1: { re: 0, im: 1 / Math.SQRT2 }, coords: { x: 0, y: 1, z: 0 } } },
  { label: '|1⟩ Excited', gates: [{ name: 'X', color: '#e74c4c' }, null, null, null, null], target: { c0: { re: 0, im: 0 }, c1: { re: 1, im: 0 }, coords: { x: 0, y: 0, z: -1 } } }
];

export default function CircuitStudio() {
  const [wireSlots, setWireSlots] = useState([null, null, null, null, null]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [probabilities, setProbabilities] = useState({ p0: 100, p1: 0 });
  const [rawAmplitudes, setRawAmplitudes] = useState({ c0: { re: 1, im: 0 }, c1: { re: 0, im: 0 } });
  const [fidelity, setFidelity] = useState(100);
  const [activeTarget, setActiveTarget] = useState(PRESETS[0]);
  const [codeTab, setCodeTab] = useState('qiskit');
  const [copied, setCopied] = useState(false);

  const [hoveredGateInfo, setHoveredGateInfo] = useState(null);
  const hoverTimerRef = useRef(null);

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Telemetry & Quantum AI Active. Drag gates onto the sequence or test continuous rotations.' }
  ]);
  const [userPrompt, setUserPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // References
  const scrollCanvasRef = useRef(null);
  const studioCanvasRef = useRef(null);
  const scrollBlochRef = useRef(null);
  const studioBlochRef = useRef(null);
  const studioSectionRef = useRef(null);

  // Initialize Three.js instances
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollCanvasRef.current && !scrollBlochRef.current) {
        scrollBlochRef.current = createBlochSphere(scrollCanvasRef.current);
      }
      if (studioCanvasRef.current && !studioBlochRef.current) {
        studioBlochRef.current = createBlochSphere(studioCanvasRef.current);
      }
    }, 50);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const targetOffset = studioSectionRef.current?.offsetTop || 1400;
      const maxScroll = targetOffset - window.innerHeight;
      if (maxScroll > 0) {
        const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
        scrollBlochRef.current?.setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      scrollBlochRef.current?.destroy?.();
      studioBlochRef.current?.destroy?.();
    };
  }, []);

  // Synchronize state vector & compute Fidelity
  useEffect(() => {
    const activeGates = wireSlots.filter(Boolean);
    const { c0, c1 } = simulateEnhanced(activeGates);
    setRawAmplitudes({ c0, c1 });

    if (studioBlochRef.current) {
      studioBlochRef.current.updateState(c0, c1);
    }

    const p0 = (c0.re ** 2 + c0.im ** 2) * 100;
    const p1 = (c1.re ** 2 + c1.im ** 2) * 100;
    setProbabilities({ p0: Math.round(p0), p1: Math.round(p1) });

    if (activeTarget) {
      const tc0 = activeTarget.target.c0;
      const tc1 = activeTarget.target.c1;
      const innerRe = tc0.re * c0.re + tc0.im * c0.im + tc1.re * c1.re + tc1.im * c1.im;
      const innerIm = tc0.re * c0.im - tc0.im * c0.re + tc1.re * c1.im - tc1.im * c1.re;
      const fid = (innerRe ** 2 + innerIm ** 2) * 100;
      setFidelity(Math.min(Math.max(Number(fid.toFixed(1)), 0), 100));
    }
  }, [wireSlots, activeTarget]);

  const loadPreset = (preset) => {
    setWireSlots(preset.gates);
    setSelectedSlotIndex(null);
    setActiveTarget(preset);
    studioBlochRef.current?.updateTargetMarker(preset.target.coords);
  };

  const scrollToStudio = () => {
    studioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateQiskitCode = () => {
    let code = `from qiskit import QuantumCircuit\nimport numpy as np\n\nqc = QuantumCircuit(1, 1)\n`;
    wireSlots.filter(Boolean).forEach((g) => {
      const name = g.name.toLowerCase();
      if (g.theta !== undefined) {
        code += `qc.${name}(${g.theta.toFixed(4)}, 0)\n`;
      } else {
        code += `qc.${name}(0)\n`;
      }
    });
    code += `qc.measure(0, 0)\nprint(qc.draw())`;
    return code;
  };

  const generateQasmCode = () => {
    let code = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\ncreg c[1];\n\n`;
    wireSlots.filter(Boolean).forEach((g) => {
      const name = g.name.toLowerCase();
      if (g.theta !== undefined) {
        code += `${name}(${g.theta.toFixed(4)}) q[0];\n`;
      } else {
        code += `${name} q[0];\n`;
      }
    });
    code += `measure q[0] -> c[0];`;
    return code;
  };

  const copyCode = () => {
    const text = codeTab === 'qiskit' ? generateQiskitCode() : generateQasmCode();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToGroq = async (customQuestion = null) => {
    const messageText = customQuestion || userPrompt;
    if (!messageText.trim()) return;

    const currentCircuit = wireSlots
      .map((g, i) => (g ? `Slot ${i + 1}: ${g.name}${g.theta ? `(${(g.theta * 180 / Math.PI).toFixed(1)}°)` : ''}` : null))
      .filter(Boolean)
      .join(', ') || 'Ground state |0⟩';

    const newChat = [...chatMessages, { role: 'user', content: messageText }];
    setChatMessages(newChat);
    setUserPrompt('');
    setIsAiLoading(true);

    if (!groqApiKey.trim()) {
      setChatMessages([
        ...newChat,
        { role: 'assistant', content: '⚠️ Paste your Groq API Key above to unlock AI diagnostics.' }
      ]);
      setIsAiLoading(false);
      return;
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are an expert quantum mentor. Simplify quantum logic clearly.
Current Circuit: ${currentCircuit}
P(0)=${probabilities.p0}%, P(1)=${probabilities.p1}%, Fidelity=${fidelity}%.`
            },
            ...newChat.map((m) => ({ role: m.role, content: m.content }))
          ],
          temperature: 0.5,
          max_tokens: 450
        })
      });

      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        setChatMessages([...newChat, { role: 'assistant', content: data.choices[0].message.content }]);
      } else {
        setChatMessages([...newChat, { role: 'assistant', content: `API Error: ${data.error?.message || 'Failed'}` }]);
      }
    } catch (err) {
      setChatMessages([...newChat, { role: 'assistant', content: `Network Error: ${err.message}` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGateHoverStart = (gateName) => {
    hoverTimerRef.current = setTimeout(() => {
      setHoveredGateInfo(GATE_INFO[gateName]);
    }, 1000);
  };

  const handleGateHoverEnd = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredGateInfo(null);
  };

  const addSlot = () => setWireSlots([...wireSlots, null]);
  const removeSlot = () => {
    if (wireSlots.length > 1) {
      setWireSlots(wireSlots.slice(0, -1));
      if (selectedSlotIndex === wireSlots.length - 1) setSelectedSlotIndex(null);
    }
  };

  const handleDragStart = (e, gate) => {
    e.dataTransfer.setData('application/json', JSON.stringify(gate));
  };

  const handleDrop = (e, slotIndex) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const nextSlots = [...wireSlots];
      nextSlots[slotIndex] = {
        name: data.name,
        color: data.color,
        theta: data.isParam ? data.defaultTheta : undefined
      };
      setWireSlots(nextSlots);
      if (data.isParam) setSelectedSlotIndex(slotIndex);
    } catch (err) {
      console.error(err);
    }
  };

  const updateAngle = (slotIndex, newDegrees) => {
    const val = parseFloat(newDegrees);
    const validDeg = isNaN(val) ? 0 : val;
    const rad = (validDeg * Math.PI) / 180;
    const nextSlots = [...wireSlots];
    if (nextSlots[slotIndex]) {
      nextSlots[slotIndex] = { ...nextSlots[slotIndex], theta: rad };
      setWireSlots(nextSlots);
    }
  };

  const clearSlot = (index) => {
    const nextSlots = [...wireSlots];
    nextSlots[index] = null;
    setWireSlots(nextSlots);
    if (selectedSlotIndex === index) setSelectedSlotIndex(null);
  };

  // Density Matrix elements
  const { c0, c1 } = rawAmplitudes;
  const rho00 = (c0.re ** 2 + c0.im ** 2).toFixed(2);
  const rho11 = (c1.re ** 2 + c1.im ** 2).toFixed(2);
  const rho01Re = (c0.re * c1.re + c0.im * c1.im).toFixed(2);
  const rho01Im = (c0.im * c1.re - c0.re * c1.im).toFixed(2);
  const rho01Str = `${rho01Re}${Number(rho01Im) >= 0 ? '+' : ''}${rho01Im}i`;
  const rho10Str = `${rho01Re}${Number(-rho01Im) >= 0 ? '+' : ''}${-rho01Im}i`;

  const selectedGate = selectedSlotIndex !== null ? wireSlots[selectedSlotIndex] : null;
  const currentAngleDeg = selectedGate?.theta !== undefined ? Number(((selectedGate.theta * 180) / Math.PI).toFixed(2)) : 0;

  return (
    <div style={{ background: '#262626', color: '#f0f0f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. SCROLL-DRIVEN LANDING SECTION */}
      <section style={{ position: 'relative', minHeight: '240vh', background: '#262626' }}>
        
        {/* Sticky 3D Bloch Sphere (Right Half) */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            width: '100%',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '6vw',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '460px',
              height: '460px',
              borderRadius: '50%',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Multi-Color Outer Gauge Ring */}
            <div
              style={{
                position: 'absolute',
                inset: '-10px',
                borderRadius: '50%',
                border: '2.5px solid transparent',
                borderTopColor: '#e74c4c',
                borderRightColor: '#f5a623',
                borderBottomColor: '#00d2ff',
                borderLeftColor: '#7ed321',
                boxShadow: '0 0 35px rgba(0, 229, 163, 0.15)',
                pointerEvents: 'none'
              }}
            />

            {/* Three.js Canvas Container */}
            <div
              ref={scrollCanvasRef}
              style={{
                width: '440px',
                height: '440px',
                borderRadius: '50%',
                cursor: 'grab',
                background: '#171717',
                border: '1px solid #333'
              }}
            />
          </div>
        </div>

        {/* Narrative Text Column (Left Half) */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '560px',
            paddingLeft: '6vw',
            paddingTop: '6vh',
            marginTop: '-100vh' // Pulls text up alongside sticky canvas
          }}
        >
          {/* Card 1 */}
          <div style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 16px',
                background: 'rgba(0, 229, 163, 0.12)',
                border: '1.5px solid #00e5a3',
                borderRadius: '24px',
                color: '#00e5a3',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
                width: 'fit-content',
                marginBottom: '16px'
              }}
            >
              Quantum Telemetry Studio
            </div>
            <h1 style={{ fontSize: '44px', fontWeight: 900, color: '#fff', margin: '0 0 16px 0', lineHeight: 1.15 }}>
              Visualizing Quantum States in Real Time
            </h1>
            <p style={{ fontSize: '15px', color: '#aaa', lineHeight: 1.6, marginBottom: '28px' }}>
              Scroll down to explore how quantum gates steer the state vector across the Bloch sphere, or jump straight into the interactive workspace.
            </p>
            <button
              onClick={scrollToStudio}
              style={{
                padding: '14px 32px',
                fontSize: '15px',
                fontWeight: 800,
                color: '#121212',
                background: 'linear-gradient(135deg, #00e5a3 0%, #00d2ff 100%)',
                border: 'none',
                borderRadius: '30px',
                cursor: 'pointer',
                width: 'fit-content',
                boxShadow: '0 0 24px rgba(0, 229, 163, 0.4)'
              }}
            >
              Launch Circuit Studio ↓
            </button>
          </div>

          {/* Card 2 */}
          <div style={{ minHeight: '75vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: '#f5a623', fontSize: '13px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Hybrid Computing & QML
            </span>
            <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', margin: '8px 0 14px 0' }}>
              Qiskit + PennyLane Integration
            </h2>
            <p style={{ fontSize: '15px', color: '#b5b5b5', lineHeight: 1.6, margin: 0 }}>
              Build and transpile standard logic circuits for IBM Quantum hardware using <strong>Qiskit</strong>, while training variational quantum neural networks and gradient optimizers with <strong>PennyLane</strong>.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{ minHeight: '75vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: '#00d2ff', fontSize: '13px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Intelligent Diagnostics
            </span>
            <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', margin: '8px 0 14px 0' }}>
              Simplified AI Explanations
            </h2>
            <p style={{ fontSize: '15px', color: '#b5b5b5', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              Hover over any gate for 1 second to inspect its transformation matrix. The built-in Groq AI assistant translates complex mathematics into plain, intuitive explanations.
            </p>
            <button
              onClick={scrollToStudio}
              style={{
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 800,
                color: '#fff',
                background: '#1f1f1f',
                border: '1.5px solid #00e5a3',
                borderRadius: '24px',
                cursor: 'pointer',
                width: 'fit-content'
              }}
            >
              Enter Interactive Workspace →
            </button>
          </div>
        </div>
      </section>

      {/* 2. FULL INTERACTIVE WORKSPACE */}
      <section
        ref={studioSectionRef}
        style={{
          minHeight: '100vh',
          background: '#1c1c1c',
          borderTop: '1px solid #333',
          padding: '24px 32px',
          boxSizing: 'border-box'
        }}
      >
        {/* Workspace Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#f5a623', margin: '0 0 4px 0' }}>
              Quantum Circuit Studio
            </h2>
            <span style={{ fontSize: '13px', color: '#888' }}>
              Single-Qubit Statevector Simulator & Quantum Telemetry
            </span>
          </div>

          <button
            onClick={() => setIsAiOpen(!isAiOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              background: isAiOpen ? '#00e5a3' : '#222',
              color: isAiOpen ? '#121212' : '#00e5a3',
              border: '1.5px solid #00e5a3',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '13px',
              boxShadow: '0 0 14px rgba(0, 229, 163, 0.25)'
            }}
          >
            <span>✨</span>
            <span>Quantum AI</span>
          </button>
        </div>

        {/* State Presets Row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#aaa', marginRight: '4px' }}>
            Textbook State Presets:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => loadPreset(p)}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                background: activeTarget?.label === p.label ? '#00e5a3' : '#262626',
                color: activeTarget?.label === p.label ? '#121212' : '#ccc',
                border: '1px solid #444',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Main 2-Column Grid */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Left Column: Circuit Wire, Matrices & Code Exporter */}
          <div style={{ flex: 1, minWidth: '460px', background: '#222', borderRadius: '16px', border: '1px solid #333', padding: '20px' }}>
            
            {/* Gate Palette */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {AVAILABLE_GATES.map((gate) => (
                <div
                  key={gate.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, gate)}
                  onMouseEnter={() => handleGateHoverStart(gate.name)}
                  onMouseLeave={handleGateHoverEnd}
                  style={{
                    width: '44px',
                    height: '44px',
                    background: '#2a2a2a',
                    border: `2px solid ${gate.color}`,
                    color: gate.color,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: 'grab',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{gate.name}</span>
                  {gate.isParam && <span style={{ fontSize: '9px' }}>(θ)</span>}
                </div>
              ))}
            </div>

            {/* Wire */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '14px 0', overflowX: 'auto' }}>
              <div style={{ position: 'absolute', left: 45, right: 0, height: '2px', background: '#444', zIndex: 0 }} />
              <span style={{ width: '45px', minWidth: '45px', fontWeight: 800, color: '#f5a623', fontSize: '14px', zIndex: 1 }}>q[0]:</span>

              <div style={{ display: 'flex', gap: '8px', zIndex: 1, paddingRight: '12px' }}>
                {wireSlots.map((gate, idx) => (
                  <div
                    key={idx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => {
                      if (gate?.theta !== undefined) setSelectedSlotIndex(idx);
                      else if (gate) clearSlot(idx);
                    }}
                    style={{
                      width: '46px',
                      height: '46px',
                      minWidth: '46px',
                      borderRadius: '10px',
                      background: gate ? '#2b2b2b' : '#171717',
                      border: selectedSlotIndex === idx ? '2px solid #00e5a3' : gate ? `2px solid ${gate.color}` : '1.5px dashed #444',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      cursor: gate ? 'pointer' : 'default',
                      color: gate ? gate.color : '#777'
                    }}
                  >
                    {gate && (
                      <>
                        <span style={{ fontSize: '12px' }}>{gate.name}</span>
                        {gate.theta !== undefined && (
                          <span style={{ fontSize: '8px' }}>{((gate.theta * 180) / Math.PI).toFixed(0)}°</span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', marginBottom: '14px' }}>
              <button onClick={addSlot} style={{ padding: '5px 12px', background: '#2e2e2e', color: '#00e5a3', border: '1px solid #00e5a366', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>+ Add Slot</button>
              <button onClick={removeSlot} style={{ padding: '5px 12px', background: '#282828', color: '#888', border: '1px solid #383838', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>- Remove Slot</button>
              <button onClick={() => setWireSlots(wireSlots.map(() => null))} style={{ padding: '5px 12px', background: '#2c1e1e', color: '#e74c4c', border: '1px solid #e74c4c55', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto' }}>Reset</button>
            </div>

            {/* Continuous Angle Controller */}
            {selectedGate && selectedGate.theta !== undefined && (
              <div style={{ padding: '12px', background: '#1c1c1c', borderRadius: '8px', border: '1px solid #444', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f5a623' }}>Adjust {selectedGate.name}(θ):</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="360"
                    value={currentAngleDeg}
                    onChange={(e) => updateAngle(selectedSlotIndex, e.target.value)}
                    style={{ width: '64px', padding: '3px 6px', background: '#121212', border: '1px solid #f5a623', borderRadius: '4px', color: '#f5a623', fontWeight: 800, textAlign: 'right', fontSize: '12px' }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={currentAngleDeg}
                  onChange={(e) => updateAngle(selectedSlotIndex, e.target.value)}
                  style={{ width: '100%', accentColor: '#f5a623', cursor: 'pointer' }}
                />
              </div>
            )}

            {/* Density Matrix (2x2) Live Heatmap */}
            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', border: '1px solid #333', marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f5a623', display: 'block', marginBottom: '8px' }}>
                Density Matrix Heatmap (ρ = |ψ⟩⟨ψ|):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', textAlign: 'center', fontFamily: 'monospace', fontSize: '11px' }}>
                <div style={{ background: '#262626', padding: '8px', borderRadius: '6px', border: '1px solid #444' }}>
                  <span style={{ color: '#888', display: 'block', fontSize: '9px' }}>ρ₀₀ (Pop. |0⟩)</span>
                  <span style={{ color: '#00e5a3', fontWeight: 800 }}>{rho00}</span>
                </div>
                <div style={{ background: '#222', padding: '8px', borderRadius: '6px', border: '1px solid #383838' }}>
                  <span style={{ color: '#888', display: 'block', fontSize: '9px' }}>ρ₀₁ (Coherence)</span>
                  <span style={{ color: '#00d2ff' }}>{rho01Str}</span>
                </div>
                <div style={{ background: '#222', padding: '8px', borderRadius: '6px', border: '1px solid #383838' }}>
                  <span style={{ color: '#888', display: 'block', fontSize: '9px' }}>ρ₁₀ (Coherence)</span>
                  <span style={{ color: '#00d2ff' }}>{rho10Str}</span>
                </div>
                <div style={{ background: '#262626', padding: '8px', borderRadius: '6px', border: '1px solid #444' }}>
                  <span style={{ color: '#888', display: 'block', fontSize: '9px' }}>ρ₁₁ (Pop. |1⟩)</span>
                  <span style={{ color: '#e74c4c', fontWeight: 800 }}>{rho11}</span>
                </div>
              </div>
            </div>

            {/* Code Exporter */}
            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setCodeTab('qiskit')}
                    style={{ padding: '3px 8px', fontSize: '11px', background: codeTab === 'qiskit' ? '#00e5a3' : '#262626', color: codeTab === 'qiskit' ? '#121212' : '#888', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Qiskit (Python)
                  </button>
                  <button
                    onClick={() => setCodeTab('qasm')}
                    style={{ padding: '3px 8px', fontSize: '11px', background: codeTab === 'qasm' ? '#00e5a3' : '#262626', color: codeTab === 'qasm' ? '#121212' : '#888', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    OpenQASM 2.0
                  </button>
                </div>
                <button
                  onClick={copyCode}
                  style={{ padding: '3px 10px', fontSize: '11px', background: '#333', color: copied ? '#00e5a3' : '#ccc', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {copied ? '✓ Copied' : 'Copy Code'}
                </button>
              </div>
              <pre style={{ margin: 0, padding: '8px', background: '#121212', borderRadius: '6px', color: '#00e5a3', fontSize: '11px', fontFamily: 'monospace', overflowX: 'auto' }}>
                {codeTab === 'qiskit' ? generateQiskitCode() : generateQasmCode()}
              </pre>
            </div>
          </div>

          {/* Right Column: Studio Bloch Sphere & Shot Simulator */}
          <div style={{ width: '420px', background: '#222', borderRadius: '16px', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Live Fidelity Meter */}
            <div style={{ background: '#181818', border: '1px solid #333', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Target State: {activeTarget?.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffb020' }}>Quantum Fidelity F(ψ, φ)</span>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 900, color: fidelity > 95 ? '#00e5a3' : fidelity > 50 ? '#ffb020' : '#e74c4c' }}>
                {fidelity}%
              </span>
            </div>

            {/* 3D Bloch Canvas */}
            <div
              ref={studioCanvasRef}
              style={{ width: '100%', height: '340px', background: '#171717', borderRadius: '12px', border: '1px solid #333', cursor: 'grab' }}
            />

            {/* Probabilities Output */}
            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', border: '1px solid #333', marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 700 }}>
                <span style={{ color: '#00e5a3' }}>|0⟩: {probabilities.p0}%</span>
                <span style={{ color: '#e74c4c' }}>|1⟩: {probabilities.p1}%</span>
              </div>
              <div style={{ height: '7px', background: '#101010', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${probabilities.p0}%`, background: '#00e5a3', transition: 'width 0.1s ease' }} />
                <div style={{ width: `${probabilities.p1}%`, background: '#e74c4c', transition: 'width 0.1s ease' }} />
              </div>
            </div>

            {/* Monte Carlo Shot Simulator */}
            <ShotSimulator probabilities={probabilities} />
          </div>

          {/* AI Drawer (Groq) */}
          {isAiOpen && (
            <div style={{ width: '340px', background: '#1c1c1c', borderRadius: '16px', border: '1px solid #444', display: 'flex', flexDirection: 'column', padding: '16px', boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#00e5a3' }}>✨ Quantum AI (Groq)</span>
                <button onClick={() => setIsAiOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
              </div>

              <input
                type="password"
                placeholder="Paste Groq API Key (gsk_...)"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', background: '#171717', border: '1px solid #333', borderRadius: '6px', color: '#00e5a3', fontSize: '12px', marginBottom: '10px', boxSizing: 'border-box' }}
              />

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      background: msg.role === 'user' ? '#333' : '#222',
                      color: '#f0f0f0',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      maxWidth: '88%'
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
                {isAiLoading && <div style={{ fontSize: '11px', color: '#00e5a3' }}>Analyzing circuit state...</div>}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Ask about this state..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendToGroq()}
                  style={{ flex: 1, padding: '6px 10px', background: '#171717', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                />
                <button
                  onClick={() => handleSendToGroq()}
                  style={{ padding: '6px 12px', background: '#00e5a3', color: '#121212', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1-Second Hover Gate Dialog Box */}
        {hoveredGateInfo && (
          <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 100, background: '#1c1c1c', border: `1.5px solid ${hoveredGateInfo.color}`, borderRadius: '10px', padding: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.8)', maxWidth: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: hoveredGateInfo.color }}>{hoveredGateInfo.name}</span>
              <span style={{ fontSize: '10px', color: '#aaa', background: '#282828', padding: '2px 6px', borderRadius: '4px' }}>Matrix</span>
            </div>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#e0e0e0' }}>{hoveredGateInfo.desc}</p>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: hoveredGateInfo.color, background: '#141414', padding: '6px 8px', borderRadius: '6px', border: '1px solid #333' }}>
              {hoveredGateInfo.matrix}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}