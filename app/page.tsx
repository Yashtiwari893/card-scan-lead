"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-extrabold text-2xl tracking-tight text-gray-900 flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">11za</span> OCR
          </div>
          <button 
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="text-gray-600 font-semibold hover:text-gray-900 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 blur-[120px] rounded-full -z-10 pointer-events-none" />
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1] text-slate-900">
          Scan cards on <br />
          <span className="text-green-500 relative inline-block">
            WhatsApp.
            <svg className="absolute w-full h-4 -bottom-1 left-0 text-green-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>
          </span>
          <br />Auto-sync everywhere.
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
          Connect your 11za WhatsApp number, snap a photo of any business card, and let AI automatically save it to your Google Workspace.
        </p>
        
        <button 
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="bg-slate-900 text-white text-xl font-semibold px-10 py-5 rounded-full shadow-2xl hover:shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-3 mx-auto"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/></svg>
          Get Started — Sign in with Google
        </button>
      </section>

      {/* Automations Section */}
      <section className="bg-slate-900 w-full py-32 mt-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">Four Instant Automations</h2>
            <p className="text-xl text-slate-400">One message on WhatsApp triggers everything automatically.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              color="from-green-400 to-green-600"
              icon="GS"
              title="Google Sheets"
              desc="Instantly append scanned contacts as neat spreadsheet rows. Perfect for CRM tracking."
            />
            <FeatureCard 
              color="from-blue-400 to-blue-600"
              icon="GC"
              title="Google Calendar"
              desc="Generate an automated follow-up calendar event for 3 days later automatically."
            />
            <FeatureCard 
              color="from-red-400 to-red-600"
              icon="GM"
              title="Gmail Follow-up"
              desc="Draft or send a fast, personalized 'Nice to meet you' follow-up email."
            />
             <FeatureCard 
              color="from-indigo-400 to-indigo-600"
              icon="CN"
              title="Google Contacts"
              desc="Drop the manual typing. Save names, numbers, and companies to your phone."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ color, icon, title, desc }: { color: string, icon: string, title: string, desc: string }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center font-bold text-xl mb-6 shadow-lg shadow-black/20`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className="text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
