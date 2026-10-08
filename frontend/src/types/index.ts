export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: 'student' | 'admin';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface TicketType {
  id: number;
  event_id: number;
  name: string;
  description?: string;
  price: string;
  max_quantity: number;
  available_quantity: number;
  sales_start?: string;
  sales_end?: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  banner_image: string;
  category: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  organizer: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'sold_out';
  max_tickets: number;
  ticketTypes: TicketType[];
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_code: string;
  ticket_type_name: string;
  student_name: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  qr_data: string;
  qrImage?: string;
  issued_at: string;
  used_at?: string;
  event?: Event;
}

export interface Booking {
  id: number;
  booking_reference: string;
  total_amount: string;
  service_charge: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  payment_status: 'pending' | 'paid' | 'refunded';
  booking_date: string;
  event: Event;
  items: BookingItem[];
  tickets?: Ticket[];
}

export interface BookingItem {
  id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
  ticketType: {
    id: number;
    name: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}