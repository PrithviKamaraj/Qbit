'use client';

import dynamic from 'next/dynamic';

const CircuitStudio = dynamic(() => import('../components/CircuitStudio'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100vw', height: '100vh', background: '#120d0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffbe98' }}>
      Loading Quantum Studio...
    </div>
  ),
});

export default function HomePage() {
  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <CircuitStudio />
    </main>
  );
}