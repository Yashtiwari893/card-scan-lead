export default function SetupSuccessPage({ searchParams }: { searchParams: { service?: string } }) {
  const service = searchParams.service || 'Integration';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-12 rounded-3xl text-center shadow-2xl max-w-lg w-full scale-in-center">
        {/* Animated Checkmark */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Already Connected!
        </h1>
        
        <p className="text-xl text-slate-300 mb-8 leading-relaxed">
          ✅ Your <span className="text-emerald-400 font-semibold capitalize">{service}</span> is now successfully set up and connected with Grid AI.
        </p>

        <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 space-y-3">
          <p className="text-slate-400 text-sm flex items-center justify-center gap-2 italic">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            You can now close this tab safely.
          </p>
          <p className="text-slate-400 text-sm flex items-center justify-center gap-2 italic">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Go back to WhatsApp and start scanning!
          </p>
        </div>

        <div className="mt-10">
          <button 
            disabled
            className="w-full bg-white/5 text-slate-500 py-4 px-6 rounded-2xl font-bold cursor-not-allowed border border-white/5 transition-all"
          >
            Connection Active
          </button>
        </div>
      </div>
    </div>
  );
}
