import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Booking, Ticket } from '../types';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ticketsRes, bookingsRes] = await Promise.all([
          api.get('/tickets/my'),
          api.get('/bookings/my'),
        ]);
        setTickets(ticketsRes.data.data);
        setBookings(bookingsRes.data.data);
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

  const upcomingTickets = tickets.filter(
    (t) => t.status === 'active' && t.event && new Date(t.event.event_date) >= new Date()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Hey, {user?.full_name} 👋</h1>
        <p className="text-gray-600 mt-1">Your tickets and bookings in one place</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button className="px-4 py-2 font-medium text-primary-600 border-b-2 border-primary-600">
          My Tickets ({upcomingTickets.length})
        </button>
      </div>

      {/* Tickets grid */}
      {upcomingTickets.length === 0 ? (
        <div className="text-center py-12 card">
          <p className="text-4xl mb-3">🎟️</p>
          <p className="text-lg font-medium text-gray-700">No tickets yet</p>
          <p className="text-gray-500 mt-1 mb-4">Browse events to get started</p>
          <Link to="/" className="btn-primary inline-block">
            Discover Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingTickets.map((ticket) => (
            <div key={ticket.id} className="card overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-4">
                <p className="text-sm opacity-90">{ticket.ticket_type_name}</p>
                <h3 className="font-bold text-lg">{ticket.event?.title}</h3>
              </div>
              <div className="p-4 flex items-center space-x-4">
                {ticket.qrImage && (
                  <img
                    src={ticket.qrImage}
                    alt="QR Code"
                    className="w-32 h-32 rounded-lg"
                  />
                )}
                <div className="flex-1 text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">Code:</span>{' '}
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      {ticket.ticket_code}
                    </code>
                  </p>
                  <p>
                    <span className="text-gray-500">Date:</span>{' '}
                    {ticket.event && format(new Date(ticket.event.event_date), 'MMM d, yyyy')}
                  </p>
                  <p>
                    <span className="text-gray-500">Venue:</span> {ticket.event?.venue}
                  </p>
                  <p className="pt-2">
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {ticket.status === 'active' ? '✅ Valid' : ticket.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking history */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Booking History</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Event</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{b.booking_reference}</td>
                    <td className="px-4 py-3">{b.event?.title}</td>
                    <td className="px-4 py-3">
                      {b.event && format(new Date(b.event.event_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${parseFloat(b.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          b.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : b.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}