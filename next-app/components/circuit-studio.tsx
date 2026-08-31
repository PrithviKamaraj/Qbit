"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { createBlochSphere, type BlochSphereHandle } from "@/lib/blochSphere";
import {
  AVAILABLE_GATES,
  amplitudesToProbabilities,
  isGateName,
  simulateSingleQubit,
  type GateName,
} from "@/lib/quantumEngine";

const EMPTY_WIRE: (GateName | null)[] = [null, null, null, null, null];

function formatAmp(value: number) {
  return value.toFixed(3);
}

export default function CircuitStudio() {
  const [wireSlots, setWireSlots] = useState<(GateName | null)[]>(EMPTY_WIRE);
  const [probabilities, setProbabilities] = useState({ p0: 100, p1: 0 });
  const [amplitudes, setAmplitudes] = useState({
    c0: { re: 1, im: 0 },
    c1: { re: 0, im: 0 },
  });
  const [hasRun, setHasRun] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const blochRef = useRef<BlochSphereHandle | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    blochRef.current = createBlochSphere(containerRef.current);
    return () => {
      blochRef.current?.destroy();
      blochRef.current = null;
    };
  }, []);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, gate: GateName) => {
    event.dataTransfer.setData("text/plain", gate);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, slotIndex: number) => {
    event.preventDefault();
    const gate = event.dataTransfer.getData("text/plain");
    if (!isGateName(gate)) return;

    setWireSlots((current) => {
      const nextSlots = [...current];
      nextSlots[slotIndex] = gate;
      return nextSlots;
    });
    setIsDirty(true);
  };

  const clearSlot = (index: number) => {
    setWireSlots((current) => {
      if (!current[index]) return current;
      const nextSlots = [...current];
      nextSlots[index] = null;
      return nextSlots;
    });
    setIsDirty(true);
  };

  const runCircuit = () => {
    const { c0, c1 } = simulateSingleQubit(wireSlots);
    blochRef.current?.updateState(c0, c1);
    setAmplitudes({ c0, c1 });
    setProbabilities(amplitudesToProbabilities(c0, c1));
    setHasRun(true);
    setIsDirty(false);
  };

  const resetCircuit = () => {
    setWireSlots([...EMPTY_WIRE]);
    const { c0, c1 } = simulateSingleQubit([]);
    blochRef.current?.updateState(c0, c1);
    setAmplitudes({ c0, c1 });
    setProbabilities({ p0: 100, p1: 0 });
    setHasRun(false);
    setIsDirty(false);
  };

  const activeGates = wireSlots.filter((gate): gate is GateName => Boolean(gate));

  return (
    <div className="flex min-h-svh flex-col bg-[#070b13] text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">
          Quantum Lab
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Circuit Studio</h1>
        <p className="mt-1 text-sm text-slate-400">
          Drag gates onto the wire, then run the circuit to update the Bloch sphere.
        </p>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 p-6 lg:grid-cols-[1fr_400px]">
        <section className="rounded-2xl border border-slate-800 bg-[#0b0f19] p-6">
          <h2 className="mb-3 text-lg font-medium">Gate palette</h2>
          <p className="mb-4 text-sm text-slate-400">
            Drag a gate onto an empty slot. Click a placed gate to remove it.
          </p>

          <div className="mb-8 flex flex-wrap gap-2">
            {AVAILABLE_GATES.map((gate) => (
              <div
                key={gate}
                draggable
                onDragStart={(event) => handleDragStart(event, gate)}
                className="flex h-11 w-11 cursor-grab items-center justify-center rounded-lg bg-indigo-600 font-bold active:cursor-grabbing"
              >
                {gate}
              </div>
            ))}
          </div>

          <h2 className="mb-3 text-lg font-medium">Qubit wire</h2>
          <div className="relative flex items-center py-6">
            <div className="absolute right-0 left-14 h-0.5 bg-slate-700" />
            <span className="w-14 font-mono font-bold text-sky-400">q[0]</span>
            <div className="z-10 flex gap-2.5">
              {wireSlots.map((gate, idx) => (
                <div
                  key={idx}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, idx)}
                  onClick={() => clearSlot(idx)}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 font-bold ${
                    gate
                      ? "cursor-pointer border-indigo-400 bg-indigo-950"
                      : "border-dashed border-slate-600 bg-slate-800"
                  }`}
                >
                  {gate}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runCircuit}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              Run circuit
            </button>
            <button
              type="button"
              onClick={resetCircuit}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Reset
            </button>
            <span className="text-sm text-slate-400">
              {activeGates.length
                ? `Sequence: ${activeGates.join(" → ")}`
                : "No gates placed"}
            </span>
            {isDirty && hasRun ? (
              <span className="text-xs text-amber-400">Unrun changes</span>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0b0f19] p-6">
          <h2 className="mb-2 text-center text-lg font-medium">Bloch sphere</h2>
          <p className="mb-3 text-center text-xs text-slate-500">
            Drag to rotate. The orange arrow is the qubit state after Run.
          </p>
          <div
            ref={containerRef}
            className="h-[340px] w-full rounded-xl border border-slate-800 bg-[#070b13]"
          />

          <div className="mt-5 rounded-xl bg-slate-900 p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>|0⟩: {probabilities.p0}%</span>
              <span>|1⟩: {probabilities.p1}%</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded bg-slate-950">
              <div
                className="bg-blue-500 transition-[width] duration-200"
                style={{ width: `${probabilities.p0}%` }}
              />
              <div
                className="bg-red-500 transition-[width] duration-200"
                style={{ width: `${probabilities.p1}%` }}
              />
            </div>
            <p className="mt-3 font-mono text-xs text-slate-400">
              α = {formatAmp(amplitudes.c0.re)}
              {amplitudes.c0.im >= 0 ? "+" : ""}
              {formatAmp(amplitudes.c0.im)}i
              <br />
              β = {formatAmp(amplitudes.c1.re)}
              {amplitudes.c1.im >= 0 ? "+" : ""}
              {formatAmp(amplitudes.c1.im)}i
            </p>
            {!hasRun ? (
              <p className="mt-2 text-xs text-slate-500">
                Place gates and press Run to simulate.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
