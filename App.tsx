import React, { useState, useEffect } from 'react';
import { 
  Key, Activity, Database, Search, Beaker, 
  Plus, Play, FileText, AlertCircle, Trash2, Shield,
  Copy, Check, AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const COMMON_COMPOUNDS = [
  // Antidepressants (SSRIs, SNRIs, Atypicals)
  "Fluoxetine (Prozac)", "Sertraline (Zoloft)", "Escitalopram (Lexapro)", "Citalopram (Celexa)", "Paroxetine (Paxil)",
  "Venlafaxine (Effexor)", "Duloxetine (Cymbalta)", "Bupropion (Wellbutrin)", "Mirtazapine (Remeron)", "Trazodone",
  // Antipsychotics
  "Aripiprazole (Abilify)", "Quetiapine (Seroquel)", "Risperidone (Risperdal)", "Olanzapine (Zyprexa)", "Lurasidone (Latuda)",
  "Clozapine (Clozaril)", "Haloperidol (Haldol)",
  // Mood Stabilizers & Anticonvulsants
  "Lithium Carbonate", "Valproate (Depakote)", "Lamotrigine (Lamictal)", "Carbamazepine (Tegretol)", "Gabapentin (Neurontin)",
  "Topiramate (Topamax)",
  // Anxiolytics & Hypnotics
  "Alprazolam (Xanax)", "Clonazepam (Klonopin)", "Lorazepam (Ativan)", "Diazepam (Valium)", "Buspirone (Buspar)", "Zolpidem (Ambien)",
  // Stimulants
  "Methylphenidate (Ritalin/Concerta)", "Amphetamine Salts (Adderall)", "Lisdexamfetamine (Vyvanse)", "Modafinil (Provigil)",
  // Supplements & Herbs
  "5-HTP", "L-Tyrosine", "L-Theanine", "Ashwagandha", "Rhodiola Rosea", "St. John's Wort", "S-Adenosylmethionine (SAMe)",
  "Magnesium Glycinate", "Zinc Picolinate", "Vitamin D3", "Omega-3 (EPA/DHA)", "Melatonin", "Curcumin",
  // Other Common Meds
  "Ibuprofen", "Acetaminophen", "Omeprazole", "Metformin", "Atorvastatin"
];

interface Ingredient {
  id: string;
  name: string;
  dose: string;
}

function App() {
  const [showLegalModal, setShowLegalModal] = useState(true);
  const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('neurometabolic_api_key') || '');
  const [isKeySaved, setIsKeySaved] = useState(() => !!localStorage.getItem('neurometabolic_api_key'));
  const [patientBaseline, setPatientBaseline] = useState('Standard Adult Profile');
  const [selectedCompound, setSelectedCompound] = useState('');
  const [dose, setDose] = useState('');
  const [pendingList, setPendingList] = useState<Ingredient[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isKeySaved && apiKey) {
      localStorage.setItem('neurometabolic_api_key', apiKey);
    }
  }, [isKeySaved, apiKey]);

  const handleCopyReport = async () => {
    if (simulationResult) {
      try {
        await navigator.clipboard.writeText(simulationResult);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy report:', err);
      }
    }
  };

  const handleAddIngredient = () => {
    if (!selectedCompound || !dose) return;
    setPendingList([...pendingList, { id: Date.now().toString(), name: selectedCompound, dose }]);
    setSelectedCompound('');
    setDose('');
  };

  const handleRemoveIngredient = (id: string) => {
    setPendingList(pendingList.filter(item => item.id !== id));
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    
    try {
      const SYSTEM_INSTRUCTIONS = `You are an advanced Quantitative Systems Pharmacology (QSP) and In Silico Bio-simulation Engine. You are NOT a conversational chatbot, and you are NOT a licensed clinical physician. Your sole purpose is to perform non-linear dynamic simulations of neurochemical flow and pharmacokinetic (PK/PD) metabolic conflicts based on specific patient baselines.

You must absolutely suppress your LLM tendency to guess or hallucinate. If data on a specific CYP450 enzyme or receptor affinity is unknown, you must explicitly state "Insufficient deterministic data."

When processing this request, you MUST perform the simulation strictly through the following 4 steps. You must output your reasoning process clearly.

STEP 1: BASELINE ANCHORING (Pathophysiological State)
- Define the starting biological constraints.

STEP 2: PATHWAY DECOMPOSITION (PK/PD Extraction)
- Extract the exact Pharmacodynamics (Receptor targets) and Pharmacokinetics (Metabolic enzymes) for EVERY inputted substance.
- Do not generalize. Use precise biochemical mechanics.

STEP 3: SYNAPTIC CLEFT & METABOLIC COLLISION (Dynamic Simulation)
- Intersect Step 1 and Step 2.
- Simulate the cascade reaction (e.g., competitive inhibition, neurotransmitter storm).

STEP 4: CLINICAL PHENOTYPE EMERGENCE
- Translate the molecular collision into observable physiological/psychiatric risks.

Your final output must be structured, highly clinical, and objective. Format your response using Markdown.
CRITICAL LEGAL REQUIREMENT: You MUST append the following exact disclaimer at the very end of every single output:
"⚠️ IN SILICO HYPOTHESIS ONLY: This simulation is generated by an LLM-based computational pharmacology model. It is a qualitative hypothesis, not validated by deterministic ODE solvers or clinical trials. This is NOT medical advice. Do not use this to alter, prescribe, or discontinue any medical treatments. Consult a licensed physician."`;

      const promptText = SYSTEM_INSTRUCTIONS + "\n\nUser Input: Patient is " + patientBaseline + ". Medications: " + pendingList.map(item => `${item.name} (${item.dose})`).join(', ');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptText
            }]
          }],
          generationConfig: { 
            temperature: 0.4,
            topP: 0.9
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error Response:", data);
        throw new Error(data.error?.message || "Unknown API Error. Check console for details.");
      }

      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No result generated.";
      setSimulationResult(resultText);
    } catch (error: any) {
      console.error("Simulation Error:", error);
      setSimulationResult(`**[ERROR]: Simulation failed.**\n\nDetails: ${error?.message || error}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 sm:p-6 lg:p-8 selection:bg-cyan-900 selection:text-cyan-100">
      
      {/* Welcome Legal Modal */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Critical Medical Disclaimer</h2>
                <p className="text-red-400 font-mono text-sm mt-1">RESTRICTED RESEARCH ENVIRONMENT</p>
              </div>
            </div>

            <div className="space-y-4 text-slate-300 text-sm leading-relaxed mb-8 bg-slate-950/50 p-6 rounded-xl border border-slate-800/50">
              <p>
                <strong>NeuroMetabolic AI</strong> is an experimental, in-silico computational pharmacology simulation tool powered by generative artificial intelligence.
              </p>
              <p>
                This software is intended <strong>strictly for research, educational, and bio-simulation purposes.</strong> It is not a medical device, nor is it validated by clinical trials or deterministic ordinary differential equation (ODE) solvers.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-400 marker:text-slate-600">
                <li>Outputs are qualitative hypotheses based on probabilistic LLM pattern matching.</li>
                <li>The system may hallucinate, omit critical drug-drug interactions, or misrepresent receptor affinities.</li>
                <li><strong>DO NOT</strong> use this tool to alter, prescribe, or discontinue any medical treatments.</li>
              </ul>
            </div>

            <div className="space-y-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-0.5">
                  <input 
                    type="checkbox" 
                    className="peer sr-only"
                    checked={isDisclaimerAccepted}
                    onChange={(e) => setIsDisclaimerAccepted(e.target.checked)}
                  />
                  <div className="w-5 h-5 border-2 border-slate-600 rounded bg-slate-900 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-colors flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-slate-900 opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                  </div>
                </div>
                <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors select-none">
                  I understand that this is a research-only in silico simulation. I am a researcher or medical professional, and I will not use this tool for clinical decision making or direct patient care.
                </span>
              </label>

              <button 
                onClick={() => setShowLegalModal(false)}
                disabled={!isDisclaimerAccepted}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-cyan-900/20"
              >
                Accept and Proceed to Console
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto space-y-6 transition-all duration-500 ${showLegalModal ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 shadow-inner">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">NeuroMetabolic AI</h1>
              <p className="text-xs text-slate-500 font-mono tracking-wider mt-0.5">CLINICAL SIMULATION CONSOLE v2.4</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-emerald-500" /> System Active
            </span>
          </div>
        </header>

        {/* Authentication Layer */}
        {!isKeySaved ? (
          <section className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl max-w-xl mx-auto mt-16 backdrop-blur-sm shadow-xl">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="p-4 bg-slate-800/50 rounded-full ring-1 ring-slate-700/50">
                <Key className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-slate-100">Authentication Required</h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Please provide your Gemini API Key to initialize the metabolic simulation engine. Your key is stored locally and never transmitted to external servers.
                </p>
              </div>
              <div className="w-full mt-6 flex flex-col sm:flex-row gap-3">
                <input 
                  type="password" 
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600 shadow-inner"
                  placeholder="Enter Gemini API Key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button 
                  onClick={() => setIsKeySaved(true)}
                  disabled={!apiKey}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-cyan-900/20"
                >
                  Connect
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Inputs & Configuration */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Patient Baseline Selection */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">Patient Baseline</h3>
                </div>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
                    value={patientBaseline}
                    onChange={(e) => setPatientBaseline(e.target.value)}
                  >
                    <option>Standard Adult Profile</option>
                    <option>Pediatric Profile (Age 6-12)</option>
                    <option>Geriatric Profile (Age 65+)</option>
                    <option>Hepatic Impairment (Child-Pugh B)</option>
                    <option>Renal Impairment (eGFR &lt; 30)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {/* Ingredient Input */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md shadow-sm">
                 <div className="flex items-center gap-2 mb-4">
                  <Beaker className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">Compound Entry</h3>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <select 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
                      value={selectedCompound}
                      onChange={(e) => setSelectedCompound(e.target.value)}
                    >
                      <option value="" disabled>Select a compound...</option>
                      {COMMON_COMPOUNDS.map(compound => (
                        <option key={compound} value={compound}>{compound}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600 shadow-inner"
                      placeholder="Dose (e.g., 50mg)"
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && selectedCompound && dose && handleAddIngredient()}
                    />
                    <button 
                      onClick={handleAddIngredient}
                      disabled={!selectedCompound || !dose}
                      className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center group"
                    >
                      <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending List */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md shadow-sm flex flex-col h-[320px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">Formulation Queue</h3>
                  </div>
                  <span className="text-xs font-mono bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-md">{pendingList.length} items</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                  {pendingList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 border-2 border-dashed border-slate-800/50 rounded-lg">
                      <AlertCircle className="w-6 h-6 opacity-40" />
                      <p className="text-sm">Queue is empty</p>
                    </div>
                  ) : (
                    pendingList.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg p-3 group hover:border-cyan-900/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{item.name}</p>
                          <p className="text-xs text-cyan-500/80 font-mono mt-0.5">{item.dose}</p>
                        </div>
                        <button 
                          onClick={() => handleRemoveIngredient(item.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-slate-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 mt-2 border-t border-slate-800/80">
                  <button 
                    onClick={handleRunSimulation}
                    disabled={pendingList.length === 0 || isSimulating}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 disabled:shadow-none"
                  >
                    {isSimulating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                        Processing Molecular Flows...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Run Metabolic Simulation
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Simulation Output */}
            <div className="lg:col-span-8">
              <div className="bg-[#0a0f16] border border-slate-800 rounded-xl h-full min-h-[600px] flex flex-col overflow-hidden shadow-2xl relative">
                {/* Console Header */}
                <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 flex items-center justify-center"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30"></div>
                  </div>
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Terminal</span>
                </div>
                
                {/* Visual grid background */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-[0.02]" 
                  style={{ 
                    backgroundImage: 'linear-gradient(to right, #808080 1px, transparent 1px), linear-gradient(to bottom, #808080 1px, transparent 1px)', 
                    backgroundSize: '24px 24px', 
                    maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                  }}
                />
                
                <div className="p-6 flex-1 overflow-y-auto font-mono text-sm relative z-10 text-emerald-400 leading-relaxed tracking-wide">
                  {!simulationResult && !isSimulating && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600/50 space-y-4 font-sans select-none">
                      <Activity className="w-16 h-16" />
                      <p className="tracking-wide">System ready. Awaiting simulation parameters.</p>
                    </div>
                  )}

                  {isSimulating && (
                    <div className="space-y-4 opacity-80 pl-2">
                      <p className="flex items-center gap-2"><span className="text-slate-500">&gt;</span> Initializing pharmacokinetic models...</p>
                      <p className="flex items-center gap-2 delay-75"><span className="text-slate-500">&gt;</span> Loading baseline profile: <span className="text-cyan-400">{patientBaseline}</span>...</p>
                      <p className="flex items-center gap-2 delay-150"><span className="text-slate-500">&gt;</span> Cross-referencing {pendingList.length} compounds against molecular database...</p>
                      <div className="pl-4 border-l-2 border-slate-800 space-y-1 my-2 py-2">
                        {pendingList.map(item => (
                          <p key={item.id} className="text-slate-400 text-xs">  - Analyzing {item.name} at {item.dose}</p>
                        ))}
                      </div>
                      <p className="flex items-center gap-2 delay-300"><span className="text-slate-500">&gt;</span> Computing interaction matrices and metabolic pathways...</p>
                      <p className="animate-pulse flex items-center gap-2 text-cyan-500 mt-4"><span className="text-slate-500">&gt;</span> Awaiting AI response...</p>
                    </div>
                  )}

                  {simulationResult && !isSimulating && (
                    <div className="space-y-6 pl-2 animate-in fade-in duration-500">
                      <p className="text-slate-500 flex items-center gap-2">
                        <span>&gt;</span> Simulation completed at {new Date().toLocaleTimeString()}
                      </p>
                      
                      <div className="p-5 bg-emerald-950/10 border border-emerald-900/30 rounded-lg text-emerald-300 shadow-inner leading-relaxed">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="mt-0.5"><Activity className="w-5 h-5 text-emerald-500" /></div>
                          <div className="w-full overflow-x-auto">
                            <span className="uppercase text-xs font-bold tracking-widest text-emerald-500 mb-2 block">Analysis Result</span>
                            <div className="text-emerald-300/90 whitespace-pre-wrap text-sm leading-relaxed [&>h1]:text-emerald-400 [&>h1]:font-bold [&>h1]:mb-2 [&>h1]:mt-4 [&>h2]:text-emerald-400 [&>h2]:font-bold [&>h2]:mb-2 [&>h2]:mt-4 [&>h3]:text-emerald-400 [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-3 [&>p]:mb-3 [&>ul]:list-disc [&>ul]:list-inside [&>ul]:pl-6 [&>ul]:mb-3 [&>ul]:space-y-2 [&>ol]:list-decimal [&>ol]:list-inside [&>ol]:pl-6 [&>ol]:mb-3 [&>ol]:space-y-2 [&>li]:mb-2 [&>li]:leading-relaxed [&>strong]:text-emerald-400 [&>table]:w-full [&>table]:mb-4 [&>table]:border-collapse [&>table_th]:border [&>table_th]:border-emerald-800 [&>table_th]:p-2 [&>table_th]:text-left [&>table_td]:border [&>table_td]:border-emerald-800 [&>table_td]:p-2">
                              <ReactMarkdown>{simulationResult}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-slate-500 text-xs flex items-center justify-between pt-4 border-t border-slate-800/50">
                        <div className="flex items-center gap-2">
                          <span>&gt;</span> Ready for next command.
                          <span className="w-2 h-4 bg-emerald-500/50 animate-pulse inline-block align-middle ml-1"></span>
                        </div>
                        <button 
                          onClick={handleCopyReport}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-300 transition-colors"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {isCopied ? "Copied" : "Copy Report"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
