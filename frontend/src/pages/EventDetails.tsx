import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Event } from '../types';
import toast from 'react-hot-toast';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/events/${id}`);
        setEvent(data.data);
      } catch (error) {
        toast.error(getErrorMessage(error));
        navigate('/');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const updateQuantity = (ticketTypeId: number, delta: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      const current = next[ticketTypeId] || 0;
      const ticketType = event?.ticketTypes.find((t) => t.id === ticketTypeId);
      const newValue = Math.max(
        0,
        Math.min(current + delta, ticketType?.available_quantity || 0, 10)
      );
      if (newValue === 0) delete next[ticketTypeId];
      else next[ticketTypeId] = newValue;
      return next;
    });
  };

  const calculateTotal = () => {
    if (!event) return 0;
    return Object.entries(quantities).reduce((sum, [ttId, qty]) => {
      const tt = event.ticketTypes.find((t) => t.id === parseInt(ttId));
      return sum + (tt ? parseFloat(tt.price) * qty : 0);
    }, 0);
  };

  const handleBook = () => {
    if (!isAuthenticated) {
      toast.error('Please login to book tickets');
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }

    const items = Object.entries(quantities).map(([ttId, quantity]) => ({
      ticketTypeId: parseInt(ttId),
      quantity,
    }));

    if (items.length === 0) {
      toast.error('Please select at least one ticket');
      return;
    }

    navigate('/checkout', {
      state: { event, items },
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-80 bg-gray-200 rounded-xl" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const totalSelected = Object.values(quantities).reduce((a, b) => a + b, 0);
  const total = calculateTotal();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Banner */}
      <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
        <img
          src={event.banner_image || 'https://via.placeholder.com/1200x400?text=Event'}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://via.placeholder.com/1200x400?text=Event';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
          <span className="inline-block px-3 py-1 bg-primary-600 rounded-full text-xs font-medium uppercase">
            {event.category}
          </span>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold">{event.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">About this event</h2>
            <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Event details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">🕐</span>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">
                    {event.start_time.slice(0, 5)}
                    {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm text-gray-500">Venue</p>
                  <p className="font-medium">{event.venue}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="text-sm text-gray-500">Organizer</p>
                  <p className="font-medium">{event.organizer || 'EventEase'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Event rules & instructions</h2>
            <ul className="space-y-2 text-gray-700 text-sm list-disc list-inside">
              <li>Please arrive 15 minutes before the event starts.</li>
              <li>Bring a valid student ID.</li>
              <li>Your QR ticket will be scanned at the entrance.</li>
              <li>No refunds within 24 hours of the event.</li>
              <li>Outside food and drinks are not allowed.</li>
            </ul>
          </div>
        </div>

        {/* Sidebar — ticket selection */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Select Tickets</h2>

            {event.status === 'sold_out' || event.ticketTypes?.every((t) => t.available_quantity === 0) ? (
              <div className="text-center py-6 text-red-600">
                <p className="text-3xl mb-2">😢</p>
                <p className="font-semibold">Sold Out</p>
              </div>
            ) : event.status === 'cancelled' ? (
              <div className="text-center py-6 text-red-600">
                <p className="text-3xl mb-2">❌</p>
                <p className="font-semibold">Event Cancelled</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {event.ticketTypes?.map((tt) => (
                    <div
                      key={tt.id}
                      className={`border rounded-lg p-4 transition ${
                        tt.available_quantity === 0
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : quantities[tt.id]
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{tt.name}</p>
                          {tt.description && (
                            <p className="text-xs text-gray-500">{tt.description}</p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-primary-600">
                          ${parseFloat(tt.price).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          {tt.available_quantity > 0
                            ? `${tt.available_quantity} available`
                            : 'Sold out'}
                        </p>

                        {tt.available_quantity > 0 && (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(tt.id, -1)}
                              disabled={!quantities[tt.id]}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-medium">
                              {quantities[tt.id] || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(tt.id, 1)}
                              disabled={
                                (quantities[tt.id] || 0) >= tt.available_quantity ||
                                (quantities[tt.id] || 0) >= 10
                              }
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {totalSelected > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Tickets</span>
                      <span className="font-medium">{totalSelected}</span>
                    </div>
                    <div className="flex justify-between mb-4 text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary-600">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBook}
                  disabled={totalSelected === 0}
                  className="btn-primary w-full mt-4"
                >
                  {totalSelected > 0
                    ? `Buy ${totalSelected} Ticket${totalSelected > 1 ? 's' : ''}`
                    : 'Select Tickets'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}