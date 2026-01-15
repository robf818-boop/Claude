import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import {
  Scan, Search, Users, Wifi, ArrowLeft, ChevronRight,
  Calculator, Book, MapPin, Tag, Video, Briefcase,
  AlertTriangle, Send, Package, Download, FileText,
  Shield, Calendar, Wrench, Image, CheckCircle2, XCircle, X
} from 'lucide-react';

// --- TYPES ---
interface Part {
  id: string;
  number: string; // Part number on diagram
  name: string;
  oemPartNumber: string;
  substitutions: string[]; // Alternative part numbers
  oemCost: number;
  retailPrice: number;
  category: string; // 'compressor', 'motor', 'coil', etc.
  warrantyEligible: boolean;
  diagramPosition?: { top: string; left: string }; // Position on exploded diagram
}

interface TroubleshootingStep {
  id: number;
  question: string;
  yesNext?: number;
  noNext?: number;
  action?: string; // Final recommendation
}

interface UnitData {
  serial: string;
  model: string;
  brand: string;
  productName: string;
  installDate: string;
  shippedDate: string;
  owner: string; // Masked for privacy
  dateTransferred: string;
  warrantyPolicy: string;
  warrantyStatus: 'Active' | 'Expired' | 'Limited';
  parts: Part[];
  diagramUrl: string; // URL to exploded diagram image
  troubleshooting: { [partId: string]: TroubleshootingStep[] };
  literatureUrls: {
    installation?: string;
    diagnostic?: string;
    warranty?: string;
    productData?: string;
    all?: string;
  };
  serviceHistory: ServiceRecord[];
}

interface ServiceRecord {
  date: string;
  tech: string;
  partReplaced: string;
  type: 'Warranty' | 'Service Call';
  status: string;
}

interface SelectedPart extends Part {
  quantity: number;
  notes: string;
  troubleshootingComplete: boolean;
}

interface Order {
  id: string;
  unitSerial: string;
  unitModel: string;
  parts: SelectedPart[];
  techUid: string;
  techName: string;
  createdAt: { seconds: number };
  status: 'pending' | 'approved' | 'ordered';
  urgent: boolean;
}

// --- FIREBASE CONFIG ---
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'unitiq-enterprise-v1';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'field' | 'office'>('field');
  const [screen, setScreen] = useState('home');
  const [unitData, setUnitData] = useState<UnitData | null>(null);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [troubleshootingPart, setTroubleshootingPart] = useState<Part | null>(null);
  const [troubleshootingStep, setTroubleshootingStep] = useState(0);
  const [urgent, setUrgent] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

  // Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth failed:", e);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Real-time Orders Sync
  useEffect(() => {
    if (!user) return;

    const ordersCol = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubscribe = onSnapshot(ordersCol, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    return () => unsubscribe();
  }, [user]);

  // Scan barcode using device camera
  const handleScan = async () => {
    try {
      setScanning(true);
      setError('');

      const qrCodeScanner = new Html5Qrcode("reader");
      setHtml5QrCode(qrCodeScanner);

      await qrCodeScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Success callback
          qrCodeScanner.stop();
          setScanning(false);
          lookupUnit(decodedText);
        },
        (errorMessage) => {
          // Error callback - just log, don't show to user
          console.log("Scan error:", errorMessage);
        }
      );
    } catch (err: any) {
      setError(err.message || 'Camera access denied');
      setScanning(false);
    }
  };

  // Stop scanning
  const stopScan = async () => {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
    }
    setScanning(false);
  };


  // Look up unit by serial or model number
  const lookupUnit = async (query: string) => {
    try {
      setLoading(true);
      setError('');

      // Query Firebase for unit data
      const unitDoc = doc(db, 'artifacts', appId, 'public', 'data', 'units', query.trim().toUpperCase());
      const unitSnap = await getDoc(unitDoc);

      if (unitSnap.exists()) {
        setUnitData(unitSnap.data() as UnitData);
        setScreen('product-details');
      } else {
        setError(`Unit ${query} not found in database. Please check the serial/model number.`);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      lookupUnit(searchQuery);
    }
  };

  // Add part to order
  const addPartToOrder = (part: Part) => {
    const existing = selectedParts.find(p => p.id === part.id);
    if (existing) {
      setSelectedParts(selectedParts.map(p =>
        p.id === part.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedParts([...selectedParts, {
        ...part,
        quantity: 1,
        notes: '',
        troubleshootingComplete: false
      }]);
    }
  };

  // Start troubleshooting for a part
  const startTroubleshooting = (part: Part) => {
    setTroubleshootingPart(part);
    setTroubleshootingStep(0);
    setScreen('troubleshooting');
  };

  // Submit order to Firebase
  const submitOrder = async () => {
    if (!user || !unitData || selectedParts.length === 0) return;

    try {
      setLoading(true);

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
        unitSerial: unitData.serial,
        unitModel: unitData.model,
        parts: selectedParts,
        techUid: user.uid,
        techName: user.email || 'Field Tech',
        createdAt: serverTimestamp(),
        status: 'pending',
        urgent: urgent
      });

      // Clear order
      setSelectedParts([]);
      setUrgent(false);
      setScreen('order-submitted');
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Order submission failed');
      setLoading(false);
    }
  };

  // Export order to Excel
  const exportToExcel = (order?: Order) => {
    const partsToExport = order ? order.parts : selectedParts;

    if (partsToExport.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(
      partsToExport.map(part => ({
        'Part Number': part.number,
        'Part Name': part.name,
        'OEM Part #': part.oemPartNumber,
        'Substitutions': part.substitutions.join(', '),
        'Quantity': part.quantity,
        'OEM Cost': `$${part.oemCost.toFixed(2)}`,
        'Retail Price': `$${part.retailPrice.toFixed(2)}`,
        'Warranty Eligible': part.warrantyEligible ? 'Yes' : 'No',
        'Category': part.category,
        'Notes': part.notes || ''
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parts Order');

    const filename = order
      ? `Order_${order.unitSerial}_${new Date(order.createdAt.seconds * 1000).toISOString().split('T')[0]}.xlsx`
      : `Parts_Order_${unitData?.serial || 'draft'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  // --- RENDER SCREENS ---

  // Loading/Error overlay
  if (loading && screen !== 'home') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white font-bold">LOADING...</p>
        </div>
      </div>
    );
  }

  // HOME SCREEN
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800/50 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">UnitIQ</h1>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Intelligence Platform</p>
            </div>
            <button
              onClick={() => setView(view === 'field' ? 'office' : 'field')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
            >
              {view === 'field' ? 'Office View' : 'Field View'}
            </button>
          </div>
        </div>

        {view === 'field' ? (
          <div className="p-6 space-y-6">
            {/* Search */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <Search className="w-6 h-6 text-white" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="By Serial or Model Number"
                  className="flex-1 bg-white/20 backdrop-blur text-white placeholder-white/60 px-4 py-3 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              {error && <p className="text-white/90 text-sm mt-2">{error}</p>}
            </div>

            {/* Barcode Scanner */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <button
                onClick={handleScan}
                disabled={loading}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 p-3 rounded-xl">
                    <Scan className="w-8 h-8 text-red-600" />
                  </div>
                  <span className="text-lg font-bold text-slate-900">By Barcode</span>
                </div>
                <div className="px-6 py-2 bg-red-600 text-white rounded-full font-bold text-sm group-hover:bg-red-700 transition">
                  Scan
                </div>
              </button>
            </div>

            {/* Additional Options */}
            <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-3">
                <Users className="w-6 h-6 text-red-700" />
                <h3 className="font-bold text-slate-900">View Customer System Online</h3>
              </div>
              <p className="text-sm text-slate-600">
                Search by customer name, address, or unit serial to view full system details
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-3">
                <Wifi className="w-6 h-6 text-red-700" />
                <h3 className="font-bold text-slate-900">Connect to Equipment</h3>
              </div>
              <p className="text-sm text-slate-600">
                Use NFC/BLE to connect to equipment for diagnostics and settings
              </p>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-white font-bold mb-4">Quick Links</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Calculator, label: 'System Calc' },
                  { icon: Book, label: 'Literature' },
                  { icon: MapPin, label: 'Store Locator' },
                  { icon: Tag, label: 'Catalog' },
                  { icon: Video, label: 'Tech Tips' },
                  { icon: Briefcase, label: 'My Jobs' },
                  { icon: AlertTriangle, label: 'Troubleshooting' },
                  { icon: Send, label: 'Parts Ref' },
                  { icon: FileText, label: 'Registration' }
                ].map((item, i) => (
                  <button
                    key={i}
                    className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition"
                  >
                    <item.icon className="w-6 h-6 text-red-600" />
                    <span className="text-xs font-bold text-slate-900 text-center">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // OFFICE VIEW
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Field Orders</h2>
            {orders.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-8 text-center">
                <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-slate-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-white font-bold text-lg">{order.unitModel}</p>
                        <p className="text-slate-400 text-sm">Serial: {order.unitSerial}</p>
                        <p className="text-slate-400 text-sm">Tech: {order.techName}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(order.createdAt.seconds * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.urgent && (
                          <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                            URGENT
                          </span>
                        )}
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          order.status === 'pending' ? 'bg-yellow-600 text-white' :
                          order.status === 'approved' ? 'bg-blue-600 text-white' :
                          'bg-green-600 text-white'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-4 mb-4">
                      <p className="text-white font-bold mb-2">Parts ({order.parts.length})</p>
                      {order.parts.map((part, i) => (
                        <div key={i} className="flex justify-between text-sm py-1">
                          <span className="text-slate-300">{part.name} x{part.quantity}</span>
                          <span className="text-slate-400">{part.oemPartNumber}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => exportToExcel(order)}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700"
                    >
                      <Download className="w-5 h-5" />
                      Export to Excel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scanner Modal */}
        {scanning && (
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            <div className="bg-slate-900 p-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Scan Data Plate</h2>
              <button onClick={stopScan} className="p-2">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <div id="reader" className="w-full max-w-md"></div>
            </div>
            <div className="bg-slate-900 p-6 text-center">
              <p className="text-white/70 text-sm">Position the serial number barcode within the frame</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PRODUCT DETAILS SCREEN
  if (screen === 'product-details' && unitData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-900 text-white p-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen('home')} className="p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center flex-1">
              <p className="font-bold text-lg">{unitData.model}</p>
              <p className="text-sm text-red-400">{unitData.serial}</p>
            </div>
            <div className="w-10"></div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <MenuItem
            icon={Shield}
            title="Entitlement Overview"
            onClick={() => setScreen('entitlement')}
          />
          <MenuItem
            icon={Image}
            title="Drawing"
            onClick={() => setScreen('drawing')}
          />
          <MenuItem
            icon={Wrench}
            title="View Parts"
            onClick={() => setScreen('parts-list')}
          />
          <MenuItem
            icon={Book}
            title="Installation Literature"
            onClick={() => window.open(unitData.literatureUrls.installation, '_blank')}
          />
          <MenuItem
            icon={FileText}
            title="Diagnostic Literature"
            onClick={() => window.open(unitData.literatureUrls.diagnostic, '_blank')}
          />
          <MenuItem
            icon={Package}
            title="Warranty Information"
            onClick={() => window.open(unitData.literatureUrls.warranty, '_blank')}
          />
          <MenuItem
            icon={Calendar}
            title="Service History"
            onClick={() => setScreen('service-history')}
          />
        </div>

        {selectedParts.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-slate-900">Parts Selected: {selectedParts.length}</p>
              <button
                onClick={() => exportToExcel()}
                className="text-blue-600 font-bold text-sm"
              >
                Export
              </button>
            </div>
            <button
              onClick={submitOrder}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold"
            >
              Submit Order
            </button>
          </div>
        )}
      </div>
    );
  }

  // ENTITLEMENT/WARRANTY SCREEN
  if (screen === 'entitlement' && unitData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="Entitlement Overview" onBack={() => setScreen('product-details')} />
        <div className="p-6 space-y-4">
          <InfoRow label="Owner" value={unitData.owner} />
          <InfoRow label="Date Installed" value={unitData.installDate} />
          <InfoRow label="Date Transferred" value={unitData.dateTransferred} />
          <InfoRow label="Policy Description" value={unitData.warrantyPolicy} />
          <InfoRow label="Shipped Date" value={unitData.shippedDate} />
          <InfoRow
            label="Warranty Status"
            value={unitData.warrantyStatus}
            highlight={unitData.warrantyStatus === 'Active'}
          />
        </div>
      </div>
    );
  }

  // DRAWING/DIAGRAM SCREEN
  if (screen === 'drawing' && unitData) {
    return (
      <div className="min-h-screen bg-white">
        <Header title="Drawing" onBack={() => setScreen('product-details')} />
        <div className="p-4">
          <h2 className="font-bold text-xl mb-4">{unitData.productName}</h2>
          <div className="bg-slate-100 rounded-lg p-4 mb-4">
            <p className="text-sm text-slate-600 mb-1"><strong>Model #</strong> {unitData.model}</p>
            <p className="text-sm text-slate-600"><strong>Serial #</strong> {unitData.serial}</p>
          </div>

          {/* Exploded Diagram */}
          <div className="relative border border-slate-300 rounded-lg overflow-hidden">
            <img
              src={unitData.diagramUrl}
              alt="Unit Diagram"
              className="w-full"
            />
            {/* Interactive hotspots for parts */}
            {unitData.parts
              .filter(p => p.diagramPosition)
              .map(part => (
                <button
                  key={part.id}
                  onClick={() => {
                    addPartToOrder(part);
                    startTroubleshooting(part);
                  }}
                  className="absolute w-8 h-8 bg-red-600 text-white rounded-full font-bold text-xs flex items-center justify-center hover:scale-125 transition shadow-lg"
                  style={{
                    top: part.diagramPosition!.top,
                    left: part.diagramPosition!.left
                  }}
                >
                  {part.number}
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // PARTS LIST SCREEN
  if (screen === 'parts-list' && unitData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="Parts List" onBack={() => setScreen('product-details')} />
        <div className="p-4 space-y-3 pb-32">
          {unitData.parts.map(part => (
            <div key={part.id} className="bg-white rounded-lg p-4 shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{part.name}</p>
                  <p className="text-sm text-slate-600">Part # {part.number}</p>
                  <p className="text-xs text-slate-500">OEM: {part.oemPartNumber}</p>
                  {part.substitutions.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Alt: {part.substitutions.join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">${part.retailPrice.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">OEM: ${part.oemCost.toFixed(2)}</p>
                  {part.warrantyEligible && (
                    <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                      WARRANTY
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => startTroubleshooting(part)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold"
                >
                  Troubleshoot
                </button>
                <button
                  onClick={() => addPartToOrder(part)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-bold"
                >
                  Add to Order
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedParts.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg">
            <div className="mb-3">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => setUrgent(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="font-bold text-slate-900">Mark as Urgent</span>
              </label>
              <p className="text-sm text-slate-600">Selected: {selectedParts.length} parts</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => exportToExcel()}
                className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
              <button
                onClick={submitOrder}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold"
              >
                Submit Order
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TROUBLESHOOTING SCREEN
  if (screen === 'troubleshooting' && troubleshootingPart && unitData) {
    const steps = unitData.troubleshooting[troubleshootingPart.id] || [];
    const currentStep = steps[troubleshootingStep];

    if (!currentStep) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-slate-600 mb-4">No troubleshooting data available for this part</p>
            <button
              onClick={() => setScreen('parts-list')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold"
            >
              Back to Parts
            </button>
          </div>
        </div>
      );
    }

    const handleAnswer = (answer: 'yes' | 'no') => {
      const nextStep = answer === 'yes' ? currentStep.yesNext : currentStep.noNext;
      if (nextStep !== undefined) {
        setTroubleshootingStep(nextStep);
      } else {
        // Mark as complete
        setSelectedParts(selectedParts.map(p =>
          p.id === troubleshootingPart.id ? { ...p, troubleshootingComplete: true } : p
        ));
        setScreen('parts-list');
      }
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <Header
          title={`Troubleshooting: ${troubleshootingPart.name}`}
          onBack={() => setScreen('parts-list')}
        />
        <div className="p-6">
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <AlertTriangle className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Step {troubleshootingStep + 1} of {steps.length}</p>
                <p className="text-lg font-bold text-slate-900">{currentStep.question}</p>
              </div>
            </div>

            {currentStep.action ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="font-bold text-green-900 mb-2">Recommendation:</p>
                <p className="text-green-800">{currentStep.action}</p>
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer('yes')}
                className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                Yes
              </button>
              <button
                onClick={() => handleAnswer('no')}
                className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                <XCircle className="w-6 h-6" />
                No
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setTroubleshootingStep(0);
              setScreen('parts-list');
            }}
            className="w-full text-slate-600 font-bold text-sm"
          >
            Cancel Troubleshooting
          </button>
        </div>
      </div>
    );
  }

  // SERVICE HISTORY SCREEN
  if (screen === 'service-history' && unitData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="Service History" onBack={() => setScreen('product-details')} />
        <div className="p-4 space-y-3">
          {unitData.serviceHistory.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-slate-500">No service history available</p>
            </div>
          ) : (
            unitData.serviceHistory.map((record, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-900">{record.partReplaced}</p>
                    <p className="text-sm text-slate-600">{record.tech}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    record.type === 'Warranty' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {record.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{record.date}</p>
                <p className="text-xs text-slate-500">Status: {record.status}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ORDER SUBMITTED SCREEN
  if (screen === 'order-submitted') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Submitted!</h2>
          <p className="text-slate-600 mb-8">Your parts order has been sent to the office</p>
          <button
            onClick={() => {
              setScreen('home');
              setUnitData(null);
            }}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Helper Components
function MenuItem({ icon: Icon, title, onClick }: { icon: any; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-lg p-4 shadow flex items-center justify-between group hover:bg-slate-50"
    >
      <div className="flex items-center gap-3">
        <div className="bg-red-100 p-2 rounded-lg">
          <Icon className="w-6 h-6 text-red-600" />
        </div>
        <span className="font-bold text-slate-900">{title}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
    </button>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="bg-slate-900 text-white p-4 flex items-center gap-4 sticky top-0 z-10">
      <button onClick={onBack} className="p-2">
        <ArrowLeft className="w-6 h-6" />
      </button>
      <h1 className="font-bold text-lg">{title}</h1>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <p className="text-sm font-bold text-slate-600 mb-1">{label}:</p>
      <p className={`${highlight ? 'text-green-600 font-bold' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
