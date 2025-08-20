import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyBookings.css';

export default function MyBookings({ user, userBookings }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    console.log("🔍 MyBookings - userBookings:", userBookings);
    console.log("🔍 MyBookings - user:", user);
    
    // Filter bookings for current user
    if (userBookings && user) {
      const userSpecificBookings = userBookings.filter(booking => 
        booking.userEmail === user.email
      );
      console.log("🔍 Filtered bookings for user:", userSpecificBookings);
      setBookings(userSpecificBookings);
    }
  }, [userBookings, user]);

  const getStatusBadge = (status, bookingExpiration) => {
    const now = new Date();
    
    if (status === 'pending' && bookingExpiration) {
      const expiration = new Date(bookingExpiration);
      const hoursLeft = Math.max(0, (expiration - now) / (1000 * 60 * 60));
      
      if (hoursLeft <= 0) {
        return <span className="status-badge expired">Expired</span>;
      } else if (hoursLeft <= 6) {
        return <span className="status-badge pending urgent">Pending ({Math.floor(hoursLeft)}h left)</span>;
      } else {
        return <span className="status-badge pending">Pending ({Math.floor(hoursLeft)}h left)</span>;
      }
    }
    
    switch(status) {
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'confirmed':
        return <span className="status-badge confirmed">Confirmed</span>;
      case 'cancelled':
        return <span className="status-badge cancelled">Cancelled</span>;
      default:
        return <span className="status-badge pending">Pending</span>;
    }
  };

  return (
    <div className="my-bookings-container">
      <header className="dashboard-header">
        <div className="user-welcome">
          <h2>Welcome, {user?.email}</h2>
        </div>
        <nav className="main-nav">
          <button 
            onClick={() => {
              console.log("Home button clicked from MyBookings");
              navigate('/dashboard');
            }}
            className="nav-link"
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'var(--text-light)',
              fontWeight: '500',
              padding: '0.5rem 0',
              fontSize: 'inherit'
            }}
          >
            Home
          </button>
          <span 
            className="nav-link active"
            style={{ 
              color: 'var(--primary)',
              fontWeight: '600',
              padding: '0.5rem 0',
              fontSize: 'inherit'
            }}
          >
            My Bookings
          </span>
          <button 
            onClick={() => {
              console.log("Messages button clicked from MyBookings");
              console.log("Navigating to /messages...");
              navigate('/messages');
            }}
            className="nav-link"
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'var(--text-light)',
              fontWeight: '500',
              padding: '0.5rem 0',
              fontSize: 'inherit'
            }}
          >
            Messages
          </button>
          <button 
            onClick={() => {
              console.log("Log out button clicked from MyBookings");
              navigate('/');
            }}
            className="nav-link"
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'var(--text-light)',
              fontWeight: '500',
              padding: '0.5rem 0',
              fontSize: 'inherit'
            }}
          >
            Log out
          </button>
        </nav>
      </header>

      <div className="bookings-content">
        <h1>My Bookings</h1>
        
        {bookings.length === 0 ? (
          <div className="no-bookings">
            <div className="no-bookings-icon">📅</div>
            <h3>No bookings yet</h3>
            <p>When you make a booking, it will appear here.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="browse-button"
            >
              Browse Available Units
            </button>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.map((booking, index) => (
              <div key={index} className="booking-card">
                <div className="booking-header">
                  <h3>{booking.resort} - {booking.unitType}</h3>
                  {getStatusBadge(booking.status, booking.bookingExpiration)}
                </div>
                
                <div className="booking-details">
                  <div className="detail-row">
                    <span className="label">Guest Email:</span>
                    <span>{booking.guestInfo?.email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Guest Name:</span>
                    <span>
                      {booking.guestInfo?.firstName && booking.guestInfo?.lastName 
                        ? `${booking.guestInfo.firstName} ${booking.guestInfo.lastName}` 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Number of Guests:</span>
                    <span>{booking.guestInfo?.numberOfGuests || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Check-in:</span>
                    <span>{booking.checkIn}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Check-out:</span>
                    <span>{booking.checkOut}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Duration:</span>
                    <span>{booking.nights} nights</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Total Cost:</span>
                    <span className="cost">{booking.cost}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Booking Date:</span>
                    <span>{new Date(booking.bookingDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {booking.status === 'pending' && (
                  <div className="payment-notice">
                    <div className="notice-header">
                      <span className="notice-icon">💳</span>
                      <strong>Payment Required</strong>
                    </div>
                    <p>Please Venmo Jing Zhu the payment. Once we receive it, we will send you confirmation email and change status to Confirmed.</p>
                    {booking.bookingExpiration && (() => {
                      const now = new Date();
                      const expiration = new Date(booking.bookingExpiration);
                      const hoursLeft = Math.max(0, (expiration - now) / (1000 * 60 * 60));
                      
                      if (hoursLeft <= 0) {
                        return (
                          <div style={{ color: '#dc3545', fontWeight: 'bold', marginTop: '1rem' }}>
                            ⏰ Payment deadline has expired. This booking may be cancelled.
                          </div>
                        );
                      } else {
                        return (
                          <div style={{ color: hoursLeft <= 6 ? '#dc3545' : '#856404', fontWeight: 'bold', marginTop: '1rem' }}>
                            ⏰ Payment deadline: {Math.floor(hoursLeft)} hours remaining
                          </div>
                        );
                      }
                    })()}
                    <div className="venmo-details">
                      <span><strong>Venmo:</strong> @JingZhu</span>
                      <span><strong>Amount:</strong> {booking.cost}</span>
                      <span><strong>Reference:</strong> WorldMark - {booking.resort}</span>
                    </div>
                  </div>
                )}

                {booking.status === 'confirmed' && (
                  <div className="confirmation-notice">
                    <div className="notice-header">
                      <span className="notice-icon">✅</span>
                      <strong>Booking Confirmed</strong>
                    </div>
                    <p>Your booking is confirmed! You should receive a confirmation email with check-in details.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}