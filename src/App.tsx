import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
  User
} from 'firebase/auth';
import {
  Scan, History,
  ShieldCheck, ChevronRight, ArrowLeft,
  Send, CheckCircle2,
  Zap, Box, Wind, Info, Wrench, Crosshair,
  RefreshCw, FileSearch, BookOpen, Clock, BadgeCheck, Package
} from 'lucide-react';

// --- TYPES ---
interface CoverageItem {
  item: string;
  covered: boolean;
  type: string;
  oemCost: number;
}

interface ClaimHistory {
  date: string;
  part: string;
  type: string;
  tech: string;
  status: string;
}

interface Manual {
  title: string;
  size: string;
}

interface DiagramPoint {
  id: number;
  name: string;
  top: string;
  left: string;
}

interface UnitData {
  brand: string;
  model: string;
  serial: string;
  installDate: string;
  warranty: {
    compressor: string;
    parts: string;
    labor: string;
    status: string;
  };
  coverage: CoverageItem[];
  claimsHistory: ClaimHistory[];
  manuals: Manual[];
  diagram: DiagramPoint[];
}

interface Ticket {
  id: string;
  partName: string;
  partType: string;
  retailPrice: number;
  isWarranty: boolean;
  unitModel: string;
  unitSerial: string;
  isUrgent: boolean;
  status: string;
  techUid: string;
  createdAt?: { seconds: number };
}

// --- GLOBALS & CONFIG ---
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'unitiq-enterprise-v1';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- ENTERPRISE UNIT KNOWLEDGE BASE ---
const UNIT_DB: Record<string, UnitData> = {
  '4TTR6036C1000A': {
    brand: 'Trane',
    model: '4TTR6036C1000A',
    serial: '184234567L',
    installDate: '2021-06-15',
    warranty: {
      compressor: '10 Years (Active)',
      parts: '5 Years (Active)',
      labor: 'Expired',
      status: 'In-Warranty'
    },
    coverage: [
      { item: 'Compressor', covered: true, type: 'Core', oemCost: 850 },
      { item: 'Condenser Coil', covered: true, type: 'Core', oemCost: 420 },
      { item: 'Blower Motor', covered: true, type: 'Part', oemCost: 245 },
      { item: 'Refrigerant', covered: false, type: 'Consumable', oemCost: 180 },
      { item: 'Dual Capacitor', covered: false, type: 'Consumable', oemCost: 45 },
      { item: 'Filter Drier', covered: false, type: 'Consumable', oemCost: 35 }
    ],
    claimsHistory: [
      { date: '2023-08-12', part: 'Contactor', type: 'Warranty Claim', tech: 'Lead Tech B.', status: 'Paid' },
      { date: '2022-01-05', part: 'Start Assist Kit', type: 'Service Call', tech: 'Tech J.', status: 'Closed' }
    ],
    manuals: [
      { title: 'Installation Guide', size: '4.2 MB' },
      { title: 'Service & Diagnostic Manual', size: '12.8 MB' },
      { title: 'Product Data Sheet', size: '1.1 MB' }
    ],
    diagram: [
      { id: 1, name: 'Fan Assembly', top: '22%', left: '52%' },
      { id: 2, name: 'Scroll Comp', top: '72%', left: '35%' },
      { id: 3, name: 'Control Board', top: '45%', left: '78%' }
    ]
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState('Field');
  const [screen, setScreen] = useState('Home');
  const [activeTab, setActiveTab] = useState('General');
  const [isUrgent, setIsUrgent] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedUnit, setScannedUnit] = useState<UnitData | null>(null);

  // Auth Handling
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth init failed:", e);
      }
    };

    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Real-time Data Sync
  useEffect(() => {
    if (!user) return;

    const ordersCol = collection(db, 'artifacts', appId, 'public', 'data', 'orders');

    // Using a simple query as per Rule 2
    const unsubscribe = onSnapshot(
      ordersCol,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
        // Sort in memory to avoid index requirements
        setTickets(
          data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
      },
      (err) => console.error("Firestore Error:", err)
    );

    return () => unsubscribe();
  }, [user]);

  const handleOrder = async (item: CoverageItem) => {
    if (!user || !scannedUnit) return;

    const retailPrice = item.oemCost * (item.oemCost <= 250 ? 10 : 7.5);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
        partName: item.item,
        partType: item.type,
        retailPrice: item.covered ? 0 : retailPrice,
        isWarranty: item.covered,
        unitModel: scannedUnit.model,
        unitSerial: scannedUnit.serial,
        isUrgent,
        status: 'Pending',
        techUid: user.uid,
        createdAt: serverTimestamp()
      });
      setScreen('Success');
    } catch (err) {
      console.error("Order failed:", err);
    }
  };

  if (!user) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-10 text-center">
      <RefreshCw className="animate-spin mb-6 text-blue-500" size={48} />
      <h1 className="text-2xl font-black uppercase tracking-[0.2em]">UnitIQ Intelligence</h1>
      <p className="text-slate-500 text-sm mt-4 font-medium">Securing Enterprise Connection...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-32 font-sans selection:bg-blue-100">
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
            <Wind size={22} strokeWidth={3} />
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter block leading-none">UNITIQ</span>
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">Enterprise</span>
          </div>
        </div>
        <button
          onClick={() => setView(view === 'Field' ? 'Office' : 'Field')}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
        >
          {view === 'Field' ? 'Office View' : 'Field Mode'}
        </button>
      </header>

      <main className="max-w-md mx-auto p-5 pt-8">
        {view === 'Office' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
              <h2 className="text-3xl font-black tracking-tight">Active Fleet</h2>
              <div className="text-right">
                <div className="text-2xl font-black text-blue-600 leading-none">{tickets.length}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase">Requests</div>
              </div>
            </div>

            <div className="space-y-4">
              {tickets.length === 0 && (
                <div className="bg-white p-12 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                  <Package size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold">No pending parts or claims.</p>
                </div>
              )}
              {tickets.map(t => (
                <div key={t.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                  {t.isUrgent && <div className="absolute top-0 right-0 bg-red-600 text-white px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest">Emergency</div>}
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${t.isWarranty ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {t.isWarranty ? 'Warranty Claim' : 'Billable Part'}
                    </span>
                    <span className="text-slate-400 font-bold text-[10px]">SN: {t.unitSerial}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">{t.partName}</h3>
                  <div className="flex justify-between items-center mt-6">
                    <div className="text-2xl font-black">${t.retailPrice?.toLocaleString() ?? '0'}</div>
                    <button className="bg-slate-950 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors">Approve</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* FIELD TECH EXPERIENCE */
          <>
            {screen === 'Home' && (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className={`p-10 rounded-[3.5rem] shadow-2xl transition-all duration-700 relative overflow-hidden ${isUrgent ? 'bg-red-600 shadow-red-200' : 'bg-blue-700 shadow-blue-200'}`}>
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                      <Zap size={12} /> Tech Assist Active
                    </div>
                    <h2 className="text-white text-4xl font-black tracking-tighter mb-2 leading-none">UnitIQ Core</h2>
                    <p className="text-white/70 text-sm mb-10 leading-relaxed font-medium pr-10">Scan data plates to unlock lifecycle data and parts availability.</p>

                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] flex items-center justify-between mb-10 border border-white/10">
                      <div>
                        <div className="text-[10px] font-black uppercase text-white/50 mb-1">Service Level</div>
                        <div className="text-white font-black text-lg">{isUrgent ? 'System Down' : 'Standard Call'}</div>
                      </div>
                      <button onClick={() => setIsUrgent(!isUrgent)} className="w-16 h-8 bg-black/20 rounded-full p-1.5 relative transition-colors shadow-inner">
                        <div className={`w-5 h-5 rounded-full transition-all shadow-lg ${isUrgent ? 'translate-x-8 bg-white' : 'bg-white/40'}`} />
                      </button>
                    </div>

                    <button onClick={() => setScreen('Scanner')} className="w-full bg-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-[0.97] transition-all text-slate-900 hover:bg-slate-50">
                      <Scan size={26} className="text-blue-600" /> Start Scan
                    </button>
                  </div>
                  <Wind className="absolute -right-16 -bottom-16 w-64 h-64 text-white/5 rotate-45" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setScreen('Log')} className="bg-white p-7 rounded-[3rem] border border-slate-200 shadow-sm text-left active:scale-95 transition-all group">
                    <Clock className="text-blue-600 mb-4 group-hover:scale-110 transition-transform" size={32} />
                    <div className="font-black text-xl">History</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Local Jobs</div>
                  </button>
                  <button className="bg-white p-7 rounded-[3rem] border border-slate-200 shadow-sm text-left opacity-30 grayscale cursor-not-allowed">
                    <BookOpen className="text-slate-400 mb-4" size={32} />
                    <div className="font-black text-xl">Training</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Knowledge</div>
                  </button>
                </div>
              </div>
            )}

            {screen === 'Scanner' && (
              <div className="animate-in slide-in-from-bottom-12 duration-500 h-[70vh]">
                <div className="relative h-full bg-slate-950 rounded-[4rem] overflow-hidden flex flex-col items-center justify-center shadow-3xl">
                  <div className="absolute inset-12 border-2 border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center">
                    {scanning ? (
                      <div className="animate-in zoom-in-90 duration-300">
                        <RefreshCw className="text-blue-500 animate-spin mx-auto mb-6" size={64} />
                        <div className="text-white font-black text-[10px] uppercase tracking-[0.4em]">Decrypting Plate...</div>
                        <div className="text-white/30 text-[8px] mt-4 font-mono">OCR HANDSHAKE...</div>
                      </div>
                    ) : (
                      <div className="text-center opacity-20">
                        <Crosshair className="text-white mx-auto mb-6" size={80} strokeWidth={1} />
                        <div className="text-white font-black text-[12px] uppercase tracking-[0.2em]">Align Crosshair</div>
                      </div>
                    )}
                  </div>
                  {scanning && <div className="absolute top-0 w-full h-[2px] bg-blue-500 shadow-[0_0_40px_rgba(59,130,246,1)] animate-pulse" style={{ top: '40%' }} />}

                  <div className="absolute bottom-12 inset-x-12">
                    <button
                      onClick={() => {
                        setScanning(true);
                        setTimeout(() => {
                          setScanning(false);
                          setScannedUnit(UNIT_DB['4TTR6036C1000A']);
                          setScreen('Dashboard');
                        }, 2200);
                      }}
                      className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
                    >
                      Authenticate
                    </button>
                    <button onClick={() => setScreen('Home')} className="w-full mt-4 text-white/40 font-black text-[10px] uppercase tracking-widest">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {screen === 'Dashboard' && scannedUnit && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
                <div className="flex items-center gap-4">
                  <button onClick={() => setScreen('Home')} className="p-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-400 shadow-sm active:scale-90"><ArrowLeft size={24} /></button>
                  <div>
                    <h3 className="font-black text-3xl tracking-tighter leading-none">Unit Profile</h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Verified SN: {scannedUnit.serial}</p>
                  </div>
                </div>

                <div className="flex bg-white p-1.5 rounded-3xl border border-slate-200 overflow-x-auto no-scrollbar shadow-inner">
                  {['General', 'Warranty', 'History', 'Docs'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-400'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'General' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                      <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase mb-4">
                        <BadgeCheck size={16} /> Certified Match
                      </div>
                      <h4 className="text-3xl font-black tracking-tight mb-2">{scannedUnit.model}</h4>
                      <p className="text-slate-400 font-bold text-sm mb-6">{scannedUnit.brand} Residential System</p>
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Install Date</div>
                          <div className="font-black text-slate-800">06/15/2021</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Zone</div>
                          <div className="font-black text-slate-800">Master Suite</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-10 rounded-[3.5rem] text-white shadow-3xl relative overflow-hidden">
                      <div className="flex justify-between items-center mb-8 relative z-10">
                        <span className="font-black text-[10px] uppercase text-blue-500 tracking-[0.3em]">Lifecycle Diagram</span>
                        <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400"><Crosshair size={20} /></div>
                      </div>
                      <div className="aspect-square bg-slate-900 rounded-[2.5rem] relative border border-white/5">
                        {scannedUnit.diagram.map(point => (
                          <div key={point.id} className="absolute group" style={{ top: point.top, left: point.left }}>
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black text-sm animate-pulse shadow-2xl shadow-blue-500/50 cursor-pointer hover:scale-125 transition-all">
                              {point.id}
                            </div>
                            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-4 py-2 rounded-2xl text-[10px] font-black shadow-2xl z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                              {point.name}
                            </div>
                          </div>
                        ))}
                        <Wind className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 w-40 h-40" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Warranty' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="bg-emerald-600 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                      <BadgeCheck size={80} className="absolute -right-4 -top-4 text-white/10 rotate-12" />
                      <div className="flex items-center gap-2 text-emerald-200 text-[11px] font-black uppercase mb-3">
                        <ShieldCheck size={18} /> Digital Certificate
                      </div>
                      <h4 className="text-3xl font-black tracking-tighter">Verified Active</h4>
                      <p className="text-emerald-50/70 text-sm mt-3 leading-relaxed font-medium">Standard manufacturer parts protection is valid until 2031.</p>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                      <h5 className="font-black text-[11px] uppercase tracking-widest text-slate-400 mb-6">Coverage Matrix</h5>
                      <div className="space-y-2">
                        {scannedUnit.coverage.map((c, i) => (
                          <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0 group">
                            <div>
                              <span className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{c.item}</span>
                              <div className="text-[9px] font-black uppercase text-slate-300 tracking-widest mt-1">{c.type}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              {c.covered ?
                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={12} /> Covered</div> :
                                <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Info size={12} /> Billable</div>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'History' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    {scannedUnit.claimsHistory.map((h, i) => (
                      <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center shrink-0 shadow-inner ${h.type === 'Warranty Claim' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                          {h.type === 'Warranty Claim' ? <FileSearch size={30} /> : <Wrench size={30} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h.date}</span>
                            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{h.status}</span>
                          </div>
                          <h6 className="font-black text-xl text-slate-800 tracking-tight leading-none mb-1">{h.part}</h6>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tight">{h.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'Docs' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    {scannedUnit.manuals.map((m, i) => (
                      <button key={i} className="w-full bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-slate-950 text-white rounded-[1.8rem] flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-xl">
                            <BookOpen size={30} />
                          </div>
                          <div className="text-left">
                            <h6 className="font-black text-lg text-slate-800 tracking-tight">{m.title}</h6>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{m.size}</p>
                          </div>
                        </div>
                        <ChevronRight className="text-slate-300" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="sticky bottom-6 pt-6 z-50">
                  <button onClick={() => setScreen('Catalog')} className="w-full bg-blue-600 text-white py-6 rounded-[2.2rem] font-black text-xl flex items-center justify-center gap-4 shadow-[0_20px_40px_rgba(37,99,235,0.3)] active:scale-95 transition-all">
                    <Wrench size={24} /> Order / File Claim
                  </button>
                </div>
              </div>
            )}

            {screen === 'Catalog' && scannedUnit && (
              <div className="space-y-5 animate-in slide-in-from-bottom-10 duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setScreen('Dashboard')} className="p-5 bg-white border border-slate-200 rounded-[1.8rem] shadow-sm"><ArrowLeft size={24} /></button>
                  <h3 className="font-black text-3xl tracking-tighter">Part Intel</h3>
                </div>

                {scannedUnit.coverage.map((c, i) => (
                  <div key={i} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-xl flex flex-col gap-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="mb-3">
                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest ${c.covered ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {c.covered ? 'Full Coverage' : 'Billable Part'}
                          </span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 leading-none">{c.item}</h4>
                        <p className="text-[10px] font-black text-slate-300 uppercase mt-3 tracking-[0.2em]">{c.type} Spec</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-black ${c.covered ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {c.covered ? '$0.00' : `$${(c.oemCost * 8).toLocaleString()}`}
                        </div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Retail Est.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOrder(c)}
                      className={`w-full py-6 rounded-[1.8rem] font-black text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all ${isUrgent ? 'bg-red-600 text-white shadow-red-100' : 'bg-slate-950 text-white'}`}
                    >
                      {c.covered ? 'Process Warranty' : 'Dispatch Order'}
                      <Send size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {screen === 'Success' && (
              <div className="text-center py-20 animate-in zoom-in-95 duration-500">
                <div className="w-40 h-40 bg-white text-emerald-500 rounded-[4rem] flex items-center justify-center mx-auto mb-12 shadow-2xl shadow-emerald-100">
                  <CheckCircle2 size={80} strokeWidth={3} />
                </div>
                <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">Logged</h2>
                <p className="text-slate-400 mt-6 px-12 text-lg font-medium leading-relaxed">Office notified. Claim synced to lifecycle registry.</p>
                <button onClick={() => setScreen('Home')} className="mt-16 bg-blue-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all">Home</button>
              </div>
            )}

            {screen === 'Log' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-6">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setScreen('Home')} className="p-5 bg-white border border-slate-200 rounded-[1.8rem] shadow-sm"><ArrowLeft size={24} /></button>
                  <h2 className="text-3xl font-black tracking-tighter">Activity Cloud</h2>
                </div>
                {tickets.length === 0 && <p className="text-slate-400 italic text-center p-20">No active dispatches found.</p>}
                {tickets.map(t => (
                  <div key={t.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group">
                    <div>
                      <div className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">{t.status}</div>
                      <div className="font-black text-2xl text-slate-800 tracking-tighter">{t.partName}</div>
                      <div className="text-[10px] text-slate-300 font-black uppercase mt-2 tracking-[0.2em]">SN: {t.unitSerial}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-slate-300"><ChevronRight size={24} /></div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ENTERPRISE FOOTER NAV */}
      {view === 'Field' && !['Scanner', 'Success'].includes(screen) && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/80 backdrop-blur-3xl rounded-[3.5rem] p-3 flex justify-around border border-slate-200 shadow-[0_30px_60px_rgba(0,0,0,0.1)] z-[1000] ring-1 ring-black/5">
          <button onClick={() => setScreen('Home')} className={`p-6 rounded-[2.5rem] transition-all duration-500 ${screen === 'Home' ? 'bg-blue-600 text-white shadow-2xl scale-110' : 'text-slate-300 hover:text-slate-600'}`}>
            <Box size={26} strokeWidth={screen === 'Home' ? 3 : 2} />
          </button>
          <button onClick={() => setScreen('Scanner')} className={`p-6 rounded-[2.5rem] transition-all duration-500 ${screen === 'Scanner' ? 'bg-blue-600 text-white shadow-2xl scale-110' : 'text-slate-300 hover:text-slate-600'}`}>
            <Scan size={26} strokeWidth={screen === 'Scanner' ? 3 : 2} />
          </button>
          <button onClick={() => setScreen('Log')} className={`p-6 rounded-[2.5rem] transition-all duration-500 ${screen === 'Log' ? 'bg-blue-600 text-white shadow-2xl scale-110' : 'text-slate-300 hover:text-slate-600'}`}>
            <History size={26} strokeWidth={screen === 'Log' ? 3 : 2} />
          </button>
        </nav>
      )}
    </div>
  );
}
