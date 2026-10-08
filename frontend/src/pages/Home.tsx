import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api';
import EventCard from '../components/events/EventCard';
import type { Event } from '../types';
import toast from 'react-hot-toast';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('event_date');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { sort };
      if (search) params.search = search;
      if (category) params.category = category;
      if (status) params.status = status;

      const { data } = await api.get('/events', { params });
      setEvents(data.data.events);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchEvents, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, status, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Discover Campus Events 🎉
        </h1>
        <p className="mt-2 text-gray-600">
          Skip the queues. Buy your tickets online in seconds.
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="🔍 Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
        >
          <option value="">All Categories</option>
          <option value="Party">Party</option>
          <option value="Conference">Conference</option>
          <option value="Sports">Sports</option>
          <option value="Workshop">Workshop</option>
          <option value="Music">Music</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input"
        >
          <option value="">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="sold_out">Sold Out</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input"
        >
          <option value="event_date">Sort: Date (Soonest)</option>
          <option value="title">Sort: Name (A-Z)</option>
        </select>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-80 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🎭</p>
          <p className="text-xl font-medium text-gray-700">No events found</p>
          <p className="text-gray-500 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}