import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api, { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

interface ScanResult {
  valid: boolean;
  status: string;
  message: string;
  ticket?: {
    code: string;
    student: string;
    event?: string;
    ticketType?: string;
    venue?: string;
    checkedInAt?: string;
  };
}

export default function AdminScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string>('');

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Prevent duplicate scans of the same code within 3 seconds
          if (decodedText === lastScanRef.current) return;
          lastScanRef.current = decodedText;
          setTimeout(() => (lastScanRef.current = ''), 3000);

          await validateQR(decodedText);
        },
        () => {} // ignore per-frame errors
      );
      setScanning(true);
    } catch (error) {
      toast.error('Camera access denied or unavailable');
      console.error(error);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const validateQR = async (qrData: string) => {
    try {
      const { data } = await api.post('/tickets/validate', { qrData });
      setResult(data);
      setHistory((prev) => [data, ...prev].slice(0, 10));

      if (data.valid) {
        toast.success('✅ Valid ticket — Entry granted');
        // Play success beep
        playBeep(800);
      } else {
        toast.error(data.message || 'Invalid ticket');
        playBeep(300);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const playBeep = (freq: number) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(() => osc.stop(), 150);
    } catch {}
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Scan Tickets 🎫</h1>

      {/* Scanner */}
      <div className="card p-6 mb-6">
        <div id="qr-reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden" />

        <div className="mt-4 flex justify-center">
          {!scanning ? (
            <button onClick={startScanner} className="btn-primary">
              📷 Start Camera
            </button>
          ) : (
            <button onClick={stopScanner} className="btn-danger">
              Stop Camera
            </button>
          )}
        </div>

        {/* Manual entry fallback */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500 mb-2">Or paste QR data manually:</p>
          <ManualEntry onValidate={validateQR} />
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`card p-6 mb-6 border-l-4 ${
            result.valid ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
          }`}
        >
          <div className="flex items-start space-x-4">
            <span className="text-4xl">{result.valid ? '✅' : '❌'}</span>
            <div className="flex-1">
              <h2 className={`text-lg font-bold ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
                {result.valid ? 'VALID TICKET' : 'INVALID / ' + result.status}
              </h2>
              <p className="text-sm text-gray-700 mt-1">{result.message}</p>

              {result.ticket && (
                <div className="mt-3 text-sm bg-white rounded-lg p-3 border border-gray-200">
                  <p><strong>Ticket:</strong> <code>{result.ticket.code}</code></p>
                  <p><strong>Student:</strong> {result.ticket.student}</p>
                  {result.ticket.event && <p><strong>Event:</strong> {result.ticket.event}</p>}
                  {result.ticket.ticketType && <p><strong>Type:</strong> {result.ticket.ticketType}</p>}
                  {result.ticket.checkedInAt && (
                    <p><strong>Checked in:</strong> {new Date(result.ticket.checkedInAt).toLocaleTimeString()}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold">Recent Scans</h2>
          </div>
          <ul className="divide-y divide-gray-200 text-sm">
            {history.map((h, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <span>{h.valid ? '✅' : '❌'}</span>
                  <span className="font-mono text-xs">{h.ticket?.code || '—'}</span>
                  <span className="text-gray-500">{h.ticket?.student}</span>
                </span>
                <span className={`text-xs font-medium ${h.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {h.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ManualEntry({ onValidate }: { onValidate: (qr: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="signature:EVT-..."
        className="input flex-1 text-xs font-mono"
      />
      <button
        onClick={() => {
          if (value.trim()) {
            onValidate(value.trim());
            setValue('');
          }
        }}
        className="btn-primary"
      >
        Validate
      </button>
    </div>
  );
}