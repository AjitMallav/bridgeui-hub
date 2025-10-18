'use client';

import Link from 'next/link';
import { ArrowRight, Brain, Eye, Sliders } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold">
              B
            </div>
            <span className="text-2xl font-bold text-gray-800">BridgeUI</span>
          </div>
          <Link
            href="/login"
            className="rounded-lg bg-purple-600 px-6 py-2 text-white transition hover:bg-purple-700"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-16 text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            Adaptive Web Experience
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Built For Everyone
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
            BridgeUI uses AI to dynamically adjust websites to match your needs.
            Set your preferences once, and watch the web adapt to you.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-purple-700"
          >
            Start Your Journey <ArrowRight size={20} />
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <Sliders className="text-purple-600" size={24} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">Set Your Preferences</h3>
            <p className="text-gray-600">
              Configure your accessibility needs and preferences once in your personal dashboard.
            </p>
          </div>

          <div className="rounded-xl bg-white p-8 shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Brain className="text-blue-600" size={24} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">AI Learns &amp; Adapts</h3>
            <p className="text-gray-600">
              Our AI recognizes patterns in how you interact and automatically adjusts interfaces.
            </p>
          </div>

          <div className="rounded-xl bg-white p-8 shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <Eye className="text-green-600" size={24} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">Works Everywhere</h3>
            <p className="text-gray-600">
              One browser extension that transforms any website to match your accessibility needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}