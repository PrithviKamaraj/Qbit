'use client';

import dynamic from 'next/dynamic';

const CircuitStudio = dynamic(() => import('../components/CircuitStudio'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100vw', height: '100vh', background: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5a3', fontFamily: 'sans-serif' }}>
      Loading Quantum Telemetry Studio...
    </div>
  ),
});

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', width: '100%', margin: 0, padding: 0, background: '#262626', overflowX: 'hidden' }}>
      <CircuitStudio />
    </main>
  );
}