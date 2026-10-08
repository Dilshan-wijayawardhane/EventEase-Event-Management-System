import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

interface Stats {
  totalEvents: number;
  upcomingEvents: number;
  totalStudents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalAttendance: number;
  attendanceRate: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topEvents, setTopEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, salesRes, topRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/sales-chart?days=30'),
          api.get('/admin/top-events'),
        ]);
        setStats(statsRes.data.data);
        setSalesData(salesRes.data.data);
        setTopEvents(topRes.data.data);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  const cards = stats
    ? [
        { label: 'Total Events', value: stats.totalEvents, icon: '📅', color: 'bg-blue-500' },
        { label: 'Upcoming', value: stats.upcomingEvents, icon: '⏰', color: 'bg-purple-500' },
        { label: 'Tickets Sold', value: stats.totalTicketsSold, icon: '🎫', color: 'bg-green-500' },
        { label: 'Students', value: stats.totalStudents, icon: '👥', color: 'bg-orange-500' },
        { label: 'Revenue', value: `$${parseFloat(String(stats.totalRevenue || 0)).toFixed(2)}`, icon: '💰', color: 'bg-emerald-500' },
        { label: 'Attendance', value: `${stats.attendanceRate}%`, icon: '✅', color: 'bg-indigo-500' },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className={`${c.color} w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl mb-2`}>
              {c.icon}
            </div>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Top Events by Tickets Sold</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topEvents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" fontSize={10} angle={-20} textAnchor="end" height={60} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="ticketsSold" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top events table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold">Event Performance</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Event</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Tickets</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Revenue</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {topEvents.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3">{e.event_date}</td>
                <td className="px-4 py-3 text-right">{e.ticketsSold}</td>
                <td className="px-4 py-3 text-right font-medium">
                  ${parseFloat(e.revenue || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center capitalize">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}