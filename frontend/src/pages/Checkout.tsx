import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api, { getErrorMessage } from '../services/api';
import type { Event, Booking } from '../types';
import toast from 'react-hot-toast';

interface LocationState {
  event: Event;
  items: { ticketTypeId: number; quantity: number }[];
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | undefined;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!state?.event || !state?.items) {
      toast.error('No booking data. Please select tickets again.');
      navigate('/');
    }
  }, [state, navigate]);

  if (!state?.event) return null;

  const { event, items } = state;

  // Calculate totals
  const lineItems = items.map((item) => {
    const tt = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
    return {
      ticketType: tt!,
      quantity: item.quantity,
      subtotal: tt ? parseFloat(tt.price) * item.quantity : 0,
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
  const serviceCharge = Math.min(subtotal * 0.02, 50);
  const total = subtotal + serviceCharge;

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      // Step 1: Create booking
      const { data: bookingRes } = await api.post('/bookings', {
        eventId: event.id,
        items,
      });

      const newBooking: Booking = bookingRes.data.booking;
      setBooking(newBooking);
      toast.success('Booking created!');

      // Step 2: Create payment intent
      const { data: paymentRes } = await api.post('/payments/create-intent', {
        bookingId: newBooking.id,
      });

      // Step 3: In DEV, use the simulation endpoint to mark as paid.
      // In production, use Stripe Elements + clientSecret.
      if (import.meta.env.DEV) {
        await api.post('/payments/simulate-success', {
          bookingId: newBooking.id,
        });
        toast.success('Payment successful! 🎉');
        navigate('/dashboard');
      } else {
        // TODO: Integrate Stripe Elements with paymentRes.data.clientSecret
        toast.error('Production Stripe flow not configured yet.');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

            <div className="flex items-start space-x-4 pb-4 border-b border-gray-200">
              <img
                src={event.banner_image || 'https://via.placeholder.com/80x80?text=E'}
                alt={event.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  📅 {format(new Date(event.event_date), 'MMM d, yyyy')} · {event.start_time.slice(0, 5)}
                </p>
                <p className="text-sm text-gray-600">📍 {event.venue}</p>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              {lineItems.map((li) => (
                <div key={li.ticketType.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {li.ticketType.name} × {li.quantity}
                  </span>
                  <span className="font-medium">${li.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Panel */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">Payment</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service charge (2%)</span>
                <span>${serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200 text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
              💳 Test mode — no real payment will be processed.
            </div>

            <button
              onClick={handleConfirm}
              disabled={processing}
              className="btn-primary w-full mt-4"
            >
              {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </button>

            <button
              onClick={() => navigate(-1)}
              disabled={processing}
              className="btn-secondary w-full mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}