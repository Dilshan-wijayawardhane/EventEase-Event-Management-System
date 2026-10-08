import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Event } from '../../types';

interface Props {
  event: Event;
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  sold_out: 'bg-orange-100 text-orange-700',
};

export default function EventCard({ event }: Props) {
  const startingPrice = event.ticketTypes?.length
    ? Math.min(...event.ticketTypes.map((t) => parseFloat(t.price)))
    : 0;

  const totalAvailable = event.ticketTypes?.reduce(
    (sum, t) => sum + t.available_quantity,
    0
  ) || 0;

  return (
    <Link to={`/events/${event.id}`} className="card overflow-hidden group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={event.banner_image || 'https://via.placeholder.com/400x200?text=Event'}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://via.placeholder.com/400x200?text=Event';
          }}
        />
        <span
          className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium capitalize ${
            statusColors[event.status] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {event.status.replace('_', ' ')}
        </span>
      </div>

      <div className="p-4">
        <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">
          {event.category || 'Event'}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition">
          {event.title}
        </h3>

        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <p className="flex items-center space-x-2">
            <span>📅</span>
            <span>
              {format(new Date(event.event_date), 'MMM d, yyyy')} · {event.start_time.slice(0, 5)}
            </span>
          </p>
          <p className="flex items-center space-x-2">
            <span>📍</span>
            <span className="truncate">{event.venue}</span>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-lg font-bold text-primary-600">
              ${startingPrice.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Available</p>
            <p className={`text-sm font-semibold ${totalAvailable > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalAvailable > 0 ? `${totalAvailable} left` : 'Sold out'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}