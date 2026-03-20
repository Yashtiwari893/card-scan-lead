"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [sheetId, setSheetId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isConnected = searchParams.get("connected") === "true";

  const connectGoogle = async () => {
    const res = await fetch("/api/integrations/google");
    const data = await res.json();
    if (data.authUrl) {
      window.location.href = data.authUrl;
    }
  };

  const saveSheetId = async () => {
    if (!sheetId) return;
    setIsSaving(true);
    let extractedId = sheetId;
    
    // Extract ID if full Google Sheet URL was pasted
    const match = sheetId.match(/\/d\/(.*?)(\/|$)/);
    if (match && match[1]) {
      extractedId = match[1];
    }
    
    const res = await fetch("/api/integrations/google", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetId: extractedId })
    });

    setIsSaving(false);
    if (res.ok) {
      alert("Sheet ID Saved successfully!");
      setSheetId(""); // Clear input
    } else {
      alert("Failed to save Sheet ID");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Google Integrations</h1>
      {isConnected && (
        <div className="mb-8 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg">
          ✅ Google Account successfully connected!
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Sheets */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">GS</div>
              <div>
                <h2 className="text-xl font-bold">Google Sheets</h2>
                <span className={`text-sm ${isConnected ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
            <p className="text-gray-600 mb-6">Auto-append scanned business cards as rows in your spreadsheet.</p>
          </div>
          
          {!isConnected ? (
             <button onClick={connectGoogle} className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">Connect Google Account</button>
          ) : (
             <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
               <label className="text-sm font-semibold text-gray-700">Paste your Google Sheet URL</label>
               <input 
                 value={sheetId} 
                 onChange={e => setSheetId(e.target.value)} 
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                 placeholder="https://docs.google.com/spreadsheets/d/.../edit" 
               />
               <button 
                 disabled={isSaving} 
                 onClick={saveSheetId} 
                 className="w-full py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all"
               >
                 {isSaving ? 'Saving...' : 'Save Configuration'}
               </button>
             </div>
          )}
        </div>

        {/* Google Calendar */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">GC</div>
              <div>
                <h2 className="text-xl font-bold">Google Calendar</h2>
                <span className={`text-sm ${isConnected ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
            <p className="text-gray-600 mb-6">Create auto follow-up events exactly 3 days after scanning a card.</p>
          </div>
          {!isConnected && <button onClick={connectGoogle} className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">Connect Google Account</button>}
        </div>

        {/* Gmail */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">GM</div>
              <div>
                <h2 className="text-xl font-bold">Gmail</h2>
                <span className={`text-sm ${isConnected ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
            <p className="text-gray-600 mb-6">Automatically send a personalized "Great meeting you" email to the contact.</p>
          </div>
          {!isConnected && <button onClick={connectGoogle} className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">Connect Google Account</button>}
        </div>

        {/* Google Contacts */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
          <div>
             <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center text-white font-bold">CN</div>
              <div>
                <h2 className="text-xl font-bold">Google Contacts</h2>
                <span className={`text-sm ${isConnected ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
            <p className="text-gray-600 mb-6">Ditch manual entry. Save people directly to your Google Contacts and phone address book.</p>
          </div>
          {!isConnected && <button onClick={connectGoogle} className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">Connect Google Account</button>}
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Integrations...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
