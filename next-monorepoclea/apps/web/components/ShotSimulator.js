'use client';

import React, { useState } from 'react';

export default function ShotSimulator({ probabilities }) {
  const [shots, setShots] = useState(1024);
  const [results, setResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runExperiment = () => {
    setIsSimulating(true);
    const p0 = (probabilities?.p0 ?? 100) / 100;
    let count0 = 0;

    // Monte Carlo Sampling Loop
    for (let i = 0; i < shots; i++) {
      if (Math.random() < p0) {
        count0++;
      }
    }
    const count1 = shots - count0;

    setTimeout(() => {
      setResults({ count0, count1 });
      setIsSimulating(false);
    }, 150);
  };

  return (
    <div style={{ background: '#171717', border: '1px solid #333', borderRadius: '10px', padding: '14px', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#f5a623' }}>
          Monte Carlo Simulator
        </span>
        
        {/* Shot Count Selectors */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[128, 512, 1024, 4096].map((count) => (
            <button
              key={count}
              onClick={() => setShots(count)}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                background: shots === count ? '#00e5a3' : '#222',
                color: shots === count ? '#121212' : '#888',
                border: '1px solid #333',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={runExperiment}
        disabled={isSimulating}
        style={{
          width: '100%',
          padding: '8px',
          background: 'linear-gradient(135deg, #00e5a3, #00d2ff)',
          color: '#121212',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 800,
          cursor: 'pointer',
          fontSize: '12px',
          marginBottom: '10px'
        }}
      >
        {isSimulating ? 'Sampling Quantum Circuit...' : `Run ${shots} Shots`}
      </button>

      {/* Outcome Distribution Histogram */}
      {results && (
        <div style={{ fontSize: '11px', color: '#bbb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#00e5a3', fontWeight: 700 }}>
              |0⟩: {results.count0} counts ({((results.count0 / shots) * 100).toFixed(1)}%)
            </span>
            <span style={{ color: '#e74c4c', fontWeight: 700 }}>
              |1⟩: {results.count1} counts ({((results.count1 / shots) * 100).toFixed(1)}%)
            </span>
          </div>

          <div style={{ height: '7px', background: '#101010', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
            <div
              style={{
                width: `${(results.count0 / shots) * 100}%`,
                background: '#00e5a3',
                boxShadow: '0 0 8px #00e5a3',
                transition: 'width 0.25s ease'
              }}
            />
            <div
              style={{
                width: `${(results.count1 / shots) * 100}%`,
                background: '#e74c4c',
                boxShadow: '0 0 8px #e74c4c',
                transition: 'width 0.25s ease'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}