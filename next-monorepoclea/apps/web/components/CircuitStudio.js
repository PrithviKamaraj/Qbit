'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createBlochSphere } from './three';
import { simulateEnhanced } from './quantumEngine';
import { animate } from 'animejs';

const GATE_INFO = {
  H: { name: 'Hadamard (H)', desc: 'Creates an equal superposition state (|0⟩ → |+⟩). Rotates 180° around (X+Z)/√2.', matrix: '[[1/√2, 1/√2], [1/√2, -1/√2]]' },
  X: { name: 'Pauli-X (NOT)', desc: 'Bit-flip gate. Rotates the state vector 180° (π radians) around the X-axis.', matrix: '[[0, 1], [1, 0]]' },
  Y: { name: 'Pauli-Y', desc: 'Bit & phase flip. Rotates the state vector 180° around the Y-axis.', matrix: '[[0, -i], [i, 0]]' },
  Z: { name: 'Pauli-Z (Phase Flip)', desc: 'Flips the sign of |1⟩. Rotates the state vector 180° around the Z-axis.', matrix: '[[1, 0], [0, -1]]' },
  S: { name: 'Phase Gate (S)', desc: 'Applies a 90° (π/2) rotation around the Z-axis.', matrix: '[[1, 0], [0, i]]' },
  T: { name: 'T Gate (π/8)', desc: 'Applies a 45° (π/4) rotation around the Z-axis.', matrix: '[[1, 0], [0, e^(iπ/4)]]' },
  Rx: { name: 'Rotation-X (Rx)', desc: 'Continuous rotation around the X-axis by arbitrary angle θ.', matrix: '[[cos(θ/2), -i sin(θ/2)], [-i sin(θ/2), cos(θ/2)]]' },
  Ry: { name: 'Rotation-Y (Ry)', desc: 'Continuous rotation around the Y-axis by arbitrary angle θ.', matrix: '[[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]]' },
  Rz: { name: 'Rotation-Z (Rz)', desc: 'Continuous rotation around the Z-axis by arbitrary angle θ.', matrix: '[[e^(-iθ/2), 0], [0, e^(iθ/2)]]' }
};

const AVAILABLE_GATES = [
  { name: 'H', isParam: false },
  { name: 'X', isParam: false },
  { name: 'Y', isParam: false },
  { name: 'Z', isParam: false },
  { name: 'S', isParam: false },
  { name: 'T', isParam: false },
  { name: 'Rx', isParam: true, defaultTheta: Math.PI / 2 },
  { name: 'Ry', isParam: true, defaultTheta: Math.PI / 2 },
  { name: 'Rz', isParam: true, defaultTheta: Math.PI / 2 }
];

export default function CircuitStudio() {
  const [viewStudio, setViewStudio] = useState(false);
  const [wireSlots, setWireSlots] = useState([null, null, null, null, null]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [probabilities, setProbabilities] = useState({ p0: 100, p1: 0 });
  const [amplitudes, setAmplitudes] = useState({ alpha: '1.000+0.000i', beta: '0.000+0.000i' });

  // 1-Second Hover Tooltip State
  const [hoveredGateInfo, setHoveredGateInfo] = useState(null);
  const hoverTimerRef = useRef(null);

  // Groq AI Drawer & Chat State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your Quantum AI assistant. Place gates on the wire or ask me anything about state evolutions and unitary matrices!' }
  ]);
  const [userPrompt, setUserPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const containerRef = useRef(null);
  const blochRef = useRef(null);
  const landingLinesRef = useRef(null);
  const hasHoveredRef = useRef(false);

  // Landing Page Anime.js Blueprint Line Animation
  useEffect(() => {
    if (!viewStudio && landingLinesRef.current) {
      animate(landingLinesRef.current.querySelectorAll('.blueprint-line'), {
        strokeDashoffset: [200, 0],
        opacity: [0.2, 0.8],
        duration: 2400,
        ease: 'outExpo',
        delay: (el, i) => i * 120,
        loop: true,
        direction: 'alternate'
      });
    }
  }, [viewStudio]);

  // Three.js Mount inside Studio
  useEffect(() => {
    if (viewStudio && containerRef.current && !blochRef.current) {
      blochRef.current = createBlochSphere(containerRef.current);
    }
    return () => {
      blochRef.current?.destroy?.();
      blochRef.current = null;
    };
  }, [viewStudio]);

  // State Simulation Sync
  useEffect(() => {
    if (!viewStudio) return;

    const activeGates = wireSlots.filter(Boolean);
    const { c0, c1 } = simulateEnhanced(activeGates);

    if (blochRef.current) {
      blochRef.current.updateState(c0, c1);
    }

    const p0 = (c0.re ** 2 + c0.im ** 2) * 100;
    const p1 = (c1.re ** 2 + c1.im ** 2) * 100;
    setProbabilities({ p0: Math.round(p0), p1: Math.round(p1) });

    const fmt = (c) => `${c.re.toFixed(3)}${c.im >= 0 ? '+' : ''}${c.im.toFixed(3)}i`;
    setAmplitudes({ alpha: fmt(c0), beta: fmt(c1) });
  }, [wireSlots, viewStudio]);

  // Groq API Call
  const handleSendToGroq = async (customQuestion = null) => {
    const messageText = customQuestion || userPrompt;
    if (!messageText.trim()) return;

    const currentCircuitDescription = wireSlots
      .map((g, i) => (g ? `Slot ${i + 1}: ${g.name}${g.theta ? `(${(g.theta * 180 / Math.PI).toFixed(1)}°)` : ''}` : null))
      .filter(Boolean)
      .join(', ') || 'No gates placed (|0⟩ ground state)';

    const newChat = [...chatMessages, { role: 'user', content: messageText }];
    setChatMessages(newChat);
    setUserPrompt('');
    setIsAiLoading(true);

    if (!groqApiKey.trim()) {
      setChatMessages([
        ...newChat,
        { role: 'assistant', content: '⚠️ Please paste your Groq API Key above to chat with the model.' }
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
              content: `You are an expert quantum computing assistant and physics mentor. 
Current Circuit Setup:
- Active Gates: ${currentCircuitDescription}
- Statevector Amplitudes: α = ${amplitudes.alpha}, β = ${amplitudes.beta}
- Measurement Probabilities: P(|0⟩) = ${probabilities.p0}%, P(|1⟩) = ${probabilities.p1}%

Provide clear, intuitive, and mathematically sound explanations tailored to the user's circuit and questions.`
            },
            ...newChat.map(m => ({ role: m.role, content: m.content }))
          ],
          temperature: 0.6,
          max_tokens: 600
        })
      });

      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        setChatMessages([...newChat, { role: 'assistant', content: data.choices[0].message.content }]);
      } else {
        setChatMessages([...newChat, { role: 'assistant', content: `API Error: ${data.error?.message || 'Failed to get response'}` }]);
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

  const handleSphereHover = () => {
    if (!hasHoveredRef.current && blochRef.current?.triggerExplosion) {
      hasHoveredRef.current = true;
      blochRef.current.triggerExplosion();
    }
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

  const selectedGate = selectedSlotIndex !== null ? wireSlots[selectedSlotIndex] : null;
  const currentAngleDeg = selectedGate?.theta !== undefined 
    ? Number(((selectedGate.theta * 180) / Math.PI).toFixed(2)) 
    : 0;

  // ==========================================
  // VIEW 1: FULL SCREEN ANIME.JS HERO LANDING
  // ==========================================
  if (!viewStudio) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#120d0b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#fdf3eb', fontFamily: 'sans-serif' }}>
        
        {/* Animated Blueprint / Technical Overlay Lines (Anime.js target) */}
        <svg ref={landingLinesRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          <line className="blueprint-line" x1="10%" y1="20%" x2="45%" y2="20%" stroke="#8c533e" strokeWidth="1.5" strokeDasharray="6 4" />
          <line className="blueprint-line" x1="45%" y1="20%" x2="52%" y2="35%" stroke="#ffbe98" strokeWidth="1.5" />
          <line className="blueprint-line" x1="90%" y1="80%" x2="55%" y2="80%" stroke="#8c533e" strokeWidth="1.5" strokeDasharray="6 4" />
          <line className="blueprint-line" x1="55%" y1="80%" x2="48%" y2="65%" stroke="#ffbe98" strokeWidth="1.5" />
          <circle className="blueprint-line" cx="50%" cy="50%" r="220" stroke="#4a3628" strokeWidth="1" fill="none" />
          <circle className="blueprint-line" cx="50%" cy="50%" r="320" stroke="#3b251a" strokeWidth="1" strokeDasharray="4 8" fill="none" />
        </svg>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '720px', padding: '0 24px' }}>
          <div style={{ display: 'inline-block', padding: '6px 14px', background: '#251a14', border: '1px solid #7c543e', borderRadius: '20px', color: '#ffbe98', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Interactive Statevector Engine
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#ffbe98', margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>
            Quantum Circuit Studio
          </h1>
          <p style={{ fontSize: '18px', color: '#d4bba7', lineHeight: '1.6', margin: '0 0 36px 0' }}>
            Real-time continuous single-qubit rotations, interactive 3D Bloch sphere vector animations, and in-depth AI state diagnostics.
          </p>
          <button
            onClick={() => setViewStudio(true)}
            style={{
              padding: '16px 42px',
              fontSize: '17px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #c27d60 0%, #8c533e 100%)',
              color: '#fff',
              border: '1px solid #ffbe98',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 12px 36px rgba(194, 125, 96, 0.4)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Launch Circuit Studio & Bloch Sphere →
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FULL SCREEN STUDIO WORKSPACE
  // ==========================================
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#120d0b', color: '#fdf3eb', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* Top Navigation Bar with AI Launch Button */}
      <header style={{ height: '60px', borderBottom: '1px solid #3b251a', background: '#1c1512', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setViewStudio(false)}
            style={{ padding: '6px 12px', background: '#2d201a', color: '#d4bba7', border: '1px solid #594030', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            ← Home
          </button>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffbe98' }}>Quantum Studio</span>
        </div>

        {/* Gemini-Style Groq AI Action Button */}
        <button
          onClick={() => setIsAiOpen(!isAiOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: isAiOpen ? '#c27d60' : '#2b1e17',
            color: '#ffbe98',
            border: '1.5px solid #ffbe98',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 4px 14px rgba(255, 190, 152, 0.2)',
            transition: 'all 0.2s ease'
          }}
        >
          <span>✨</span>
          <span>Quantum AI</span>
        </button>
      </header>

      {/* Main Workspace Body */}
      <div style={{ flex: 1, display: 'flex', padding: '24px', gap: '24px', overflowY: 'auto' }}>
        
        {/* Left Section: Circuit Wire and Gate Controls */}
        <div style={{ flex: 1, background: '#1c1512', borderRadius: '16px', border: '1px solid #3b251a', padding: '24px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#ffbe98', fontWeight: 700 }}>Logic Gate Sequence</h3>
          <p style={{ fontSize: '13px', color: '#d4bba7', margin: '0 0 16px 0' }}>
            Hover over any gate for 1s to view its unitary matrix. Drag gates onto the wire.
          </p>

          {/* Gate Palette */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {AVAILABLE_GATES.map((gate) => (
              <div
                key={gate.name}
                draggable
                onDragStart={(e) => handleDragStart(e, gate)}
                onMouseEnter={() => handleGateHoverStart(gate.name)}
                onMouseLeave={handleGateHoverEnd}
                style={{
                  width: '46px',
                  height: '46px',
                  background: gate.isParam ? '#8c533e' : '#c27d60',
                  border: '1px solid #ffbe98',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  cursor: 'grab',
                  userSelect: 'none',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              >
                <span style={{ fontSize: '14px' }}>{gate.name}</span>
                {gate.isParam && <span style={{ fontSize: '9px', color: '#ffbe98' }}>(θ)</span>}
              </div>
            ))}
          </div>

          {/* Quantum Wire */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '16px 0', overflowX: 'auto' }}>
            <div style={{ position: 'absolute', left: 45, right: 0, height: '2px', background: '#594030', zIndex: 0 }} />
            <span style={{ width: '45px', minWidth: '45px', fontWeight: 'bold', color: '#ffbe98', fontSize: '14px', zIndex: 1 }}>q[0]:</span>

            <div style={{ display: 'flex', gap: '10px', zIndex: 1, paddingRight: '12px' }}>
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
                    width: '48px',
                    height: '48px',
                    minWidth: '48px',
                    borderRadius: '10px',
                    background: gate ? (gate.theta !== undefined ? '#703e2c' : '#a35f43') : '#2d201a',
                    border: selectedSlotIndex === idx ? '2px solid #ffbe98' : (gate ? '1.5px solid #d48b6a' : '1.5px dashed #594030'),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    cursor: gate ? 'pointer' : 'default'
                  }}
                >
                  {gate && (
                    <>
                      <span style={{ fontSize: '13px', color: '#fff' }}>{gate.name}</span>
                      {gate.theta !== undefined && (
                        <span style={{ fontSize: '9px', color: '#ffbe98' }}>{((gate.theta * 180) / Math.PI).toFixed(0)}°</span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wire Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button onClick={addSlot} style={{ padding: '6px 12px', background: '#594030', color: '#ffbe98', border: '1px solid #7c543e', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>+ Add Slot</button>
            <button onClick={removeSlot} style={{ padding: '6px 12px', background: '#3b251a', color: '#d4bba7', border: '1px solid #594030', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>- Remove Slot</button>
            <button onClick={() => setWireSlots(wireSlots.map(() => null))} style={{ padding: '6px 12px', background: '#2d201a', color: '#ff8a7a', border: '1px solid #594030', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto' }}>Reset</button>
          </div>

          {/* Continuous Angle Controller */}
          {selectedGate && selectedGate.theta !== undefined && (
            <div style={{ marginTop: '16px', padding: '14px', background: '#2b1e17', borderRadius: '10px', border: '1px solid #7c543e' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffbe98' }}>Adjust {selectedGate.name}(θ):</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="360"
                  value={currentAngleDeg}
                  onChange={(e) => updateAngle(selectedSlotIndex, e.target.value)}
                  style={{ width: '74px', padding: '4px 6px', background: '#1a110d', border: '1px solid #c27d60', borderRadius: '6px', color: '#ffbe98', fontWeight: 'bold', textAlign: 'right', fontSize: '13px' }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={currentAngleDeg}
                onChange={(e) => updateAngle(selectedSlotIndex, e.target.value)}
                style={{ width: '100%', accentColor: '#ffbe98', cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Probabilities Output */}
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <div style={{ background: '#251a14', padding: '14px', borderRadius: '10px', border: '1px solid #452e22' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                <span style={{ color: '#ffbe98' }}>|0⟩: {probabilities.p0}%</span>
                <span style={{ color: '#d48b6a' }}>|1⟩: {probabilities.p1}%</span>
              </div>
              <div style={{ height: '8px', background: '#140c09', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                <div style={{ width: `${probabilities.p0}%`, background: '#ffbe98', transition: 'width 0.1s ease' }} />
                <div style={{ width: `${probabilities.p1}%`, background: '#d48b6a', transition: 'width 0.1s ease' }} />
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#d4bba7' }}>
                α = {amplitudes.alpha} | β = {amplitudes.beta}
              </div>
            </div>
          </div>
        </div>

        {/* Middle/Right: Three.js Bloch Sphere */}
        <div style={{ width: '420px', background: '#1c1512', borderRadius: '16px', border: '1px solid #3b251a', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#ffbe98', fontSize: '16px' }}>Bloch Sphere</h4>
          <div
            ref={containerRef}
            onMouseEnter={handleSphereHover}
            style={{ width: '100%', height: '360px', background: '#120d0b', borderRadius: '12px', border: '1px solid #3b251a', cursor: 'grab' }}
          />
          <button
            onClick={() => handleSendToGroq("Explain the physical position of this statevector on the Bloch sphere.")}
            style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#3b251a', color: '#ffbe98', border: '1px solid #7c543e', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            ✨ Ask AI to Explain This State
          </button>
        </div>

        {/* Rightmost Slide-in Groq AI Drawer */}
        {isAiOpen && (
          <div style={{ width: '360px', background: '#1a120e', borderRadius: '16px', border: '1px solid #7c543e', display: 'flex', flexDirection: 'column', padding: '18px', boxShadow: '-8px 0 24px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ffbe98' }}>✨ Quantum AI (Groq)</span>
              <button onClick={() => setIsAiOpen(false)} style={{ background: 'none', border: 'none', color: '#d4bba7', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {/* Groq API Key Input */}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="password"
                placeholder="Paste Groq API Key (gsk_...)"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', background: '#120d0b', border: '1px solid #594030', borderRadius: '6px', color: '#ffbe98', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Message History */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', marginBottom: '12px' }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'user' ? '#703e2c' : '#281a13',
                    color: '#fdf3eb',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    maxWidth: '85%'
                  }}
                >
                  {msg.content}
                </div>
              ))}
              {isAiLoading && <div style={{ fontSize: '12px', color: '#ffbe98' }}>AI is thinking...</div>}
            </div>

            {/* Input Bar */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Ask about this state..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendToGroq()}
                style={{ flex: 1, padding: '8px 10px', background: '#120d0b', border: '1px solid #594030', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
              />
              <button
                onClick={() => handleSendToGroq()}
                style={{ padding: '8px 14px', background: '#c27d60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1-Second Hover Gate Dialog Overlay Modal */}
      {hoveredGateInfo && (
        <div style={{ position: 'absolute', top: '70px', left: '24px', zIndex: 100, background: '#2d1c15', border: '1.5px solid #ffbe98', borderRadius: '10px', padding: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.7)', maxWidth: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffbe98' }}>{hoveredGateInfo.name}</span>
            <span style={{ fontSize: '10px', color: '#d4bba7', background: '#452e22', padding: '2px 6px', borderRadius: '4px' }}>Matrix</span>
          </div>
          <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#fdf3eb' }}>{hoveredGateInfo.desc}</p>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#d4bba7', background: '#140c09', padding: '6px 8px', borderRadius: '6px' }}>
            {hoveredGateInfo.matrix}
          </div>
        </div>
      )}
    </div>
  );
}