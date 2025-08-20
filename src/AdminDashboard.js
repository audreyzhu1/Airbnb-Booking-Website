import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInterface from './ChatInterface';  // ADD THIS LINE
import './AdminDashboard.css';

export default function AdminDashboard({ user, userBookings, updateBookingStatus, addLog }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bookings');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [logs, setLogs] = useState([
    {
      id: 1,
      timestamp: new Date().toISOString(),
      action: 'Admin logged in',
      admin: user?.email || 'Admin',
      bookingId: null
    }
  ]);
  const [showAddBookingForm, setShowAddBookingForm] = useState(false);
  const [newBooking, setNewBooking] = useState({
    guestInfo: {
      email: '',
      firstName: '',
      lastName: '',
      numberOfGuests: ''
    },
    resort: '',
    unitType: '',
    checkIn: '',
    checkOut: '',
    nights: '',
    cost: ''
  });

  useEffect(() => {
    setBookings(userBookings || []);
  }, [userBookings]);

  const filteredBookings = bookings.filter(booking => {
    if (statusFilter === 'all') return true;
    return booking.status === statusFilter;
  });

  const handleStatusChange = (bookingIndex, newStatus) => {
    const booking = bookings[bookingIndex];
    const oldStatus = booking.status;
    
    // Update booking status
    updateBookingStatus(bookingIndex, newStatus);
    
    // Add log entry
    const logEntry = {
      id: logs.length + 1,
      timestamp: new Date().toISOString(),
      action: `${user?.email || 'Admin'} marked booking #${bookingIndex + 1} as ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      admin: user?.email || 'Admin',
      bookingId: bookingIndex + 1,
      previousStatus: oldStatus
    };
    
    addLog(logEntry);
    setLogs(prev => [logEntry, ...prev]);
  };

  const handleAddManualBooking = () => {
    // Validate required fields
    if (!newBooking.guestInfo.email || !newBooking.guestInfo.firstName || 
        !newBooking.guestInfo.lastName || !newBooking.resort || 
        !newBooking.checkIn || !newBooking.checkOut || !newBooking.cost) {
      alert('Please fill in all required fields.');
      return;
    }

    const manualBooking = {
      ...newBooking,
      userEmail: newBooking.guestInfo.email,
      bookingDate: new Date().toISOString(),
      status: 'pending',
      isManualBooking: true,
      addedBy: user?.email || 'Admin'
    };

    // Add booking to system
    updateBookingStatus(-1, null, manualBooking); // -1 indicates new booking

    // Add log entry
    const logEntry = {
      id: logs.length + 1,
      timestamp: new Date().toISOString(),
      action: `${user?.email || 'Admin'} manually added booking for ${newBooking.guestInfo.firstName} ${newBooking.guestInfo.lastName}`,
      admin: user?.email || 'Admin',
      bookingId: bookings.length + 1
    };
    
    addLog(logEntry);
    setLogs(prev => [logEntry, ...prev]);

    // Reset form
    setNewBooking({
      guestInfo: {
        email: '',
        firstName: '',
        lastName: '',
        numberOfGuests: ''
      },
      resort: '',
      unitType: '',
      checkIn: '',
      checkOut: '',
      nights: '',
      cost: ''
    });
    setShowAddBookingForm(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-welcome">
          <h2>Admin Dashboard - {user?.email}</h2>
        </div>
        <nav className="admin-nav">
          <button 
            onClick={() => navigate('/')}
            className="logout-btn"
          >
            Log Out
          </button>
        </nav>
      </header>

      <div className="admin-content">
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📊 Bookings
          </button>
          <button 
            className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            💬 Messages
          </button>
          <button 
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📋 Logs
          </button>
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bookings-tab">
            <div className="bookings-controls">
              <div className="filter-section">
                <label htmlFor="status-filter">Filter by Status:</label>
                <select 
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Bookings</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <button 
                className="add-booking-btn"
                onClick={() => setShowAddBookingForm(true)}
              >
                + Add Manual Booking
              </button>
            </div>

            <div className="bookings-summary">
              <div className="summary-card">
                <h3>Total Bookings</h3>
                <span className="summary-number">{bookings.length}</span>
              </div>
              <div className="summary-card pending">
                <h3>Pending</h3>
                <span className="summary-number">{bookings.filter(b => b.status === 'pending').length}</span>
              </div>
              <div className="summary-card confirmed">
                <h3>Paid</h3>
                <span className="summary-number">{bookings.filter(b => b.status === 'confirmed').length}</span>
              </div>
              <div className="summary-card cancelled">
                <h3>Cancelled</h3>
                <span className="summary-number">{bookings.filter(b => b.status === 'cancelled').length}</span>
              </div>
            </div>

            <div className="bookings-table-container">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer Name</th>
                    <th>Email</th>
                    <th>Resort</th>
                    <th>Dates</th>
                    <th>Guests</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking, index) => (
                    <tr key={index}>
                      <td>#{index + 1}</td>
                      <td>
                        {booking.guestInfo?.firstName && booking.guestInfo?.lastName 
                          ? `${booking.guestInfo.firstName} ${booking.guestInfo.lastName}` 
                          : 'N/A'}
                      </td>
                      <td>{booking.guestInfo?.email || booking.userEmail || 'N/A'}</td>
                      <td>{booking.resort} - {booking.unitType}</td>
                      <td>{booking.checkIn} to {booking.checkOut}</td>
                      <td>{booking.guestInfo?.numberOfGuests || 'N/A'}</td>
                      <td>{booking.cost}</td>
                      <td>
                        <span className={`status-badge ${booking.status}`}>
                          {booking.status === 'confirmed' ? 'Paid' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <select 
                          value={booking.status}
                          onChange={(e) => handleStatusChange(index, e.target.value)}
                          className="status-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Paid</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredBookings.length === 0 && (
                <div className="no-bookings-admin">
                  <p>No bookings found for the selected filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
            <div className="messages-tab-fullscreen">
                <ChatInterface 
                user={user} 
                userBookings={userBookings} 
                isAdminView={true}
                />
            </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="logs-tab">
            <h3>System Activity Logs</h3>
            <div className="logs-container">
              {logs.map(log => (
                <div key={log.id} className="log-entry">
                  <div className="log-timestamp">
                    {formatTimestamp(log.timestamp)}
                  </div>
                  <div className="log-action">
                    {log.action}
                  </div>
                  <div className="log-admin">
                    by {log.admin}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Manual Booking Modal */}
      {showAddBookingForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add Manual Booking</h2>
            <div className="manual-booking-form">
              <div className="form-section">
                <h3>Guest Information</h3>
                <div className="form-row">
                  <input
                    type="email"
                    placeholder="Email *"
                    value={newBooking.guestInfo.email}
                    onChange={(e) => setNewBooking(prev => ({
                      ...prev,
                      guestInfo: { ...prev.guestInfo, email: e.target.value }
                    }))}
                  />
                </div>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={newBooking.guestInfo.firstName}
                    onChange={(e) => setNewBooking(prev => ({
                      ...prev,
                      guestInfo: { ...prev.guestInfo, firstName: e.target.value }
                    }))}
                  />
                  <input
                    type="text"
                    placeholder="Last Name *"
                    value={newBooking.guestInfo.lastName}
                    onChange={(e) => setNewBooking(prev => ({
                      ...prev,
                      guestInfo: { ...prev.guestInfo, lastName: e.target.value }
                    }))}
                  />
                </div>
                <div className="form-row">
                  <input
                    type="number"
                    placeholder="Number of Guests"
                    value={newBooking.guestInfo.numberOfGuests}
                    onChange={(e) => setNewBooking(prev => ({
                      ...prev,
                      guestInfo: { ...prev.guestInfo, numberOfGuests: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Booking Details</h3>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Resort *"
                    value={newBooking.resort}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, resort: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Unit Type"
                    value={newBooking.unitType}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, unitType: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <input
                    type="date"
                    placeholder="Check-in *"
                    value={newBooking.checkIn}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, checkIn: e.target.value }))}
                  />
                  <input
                    type="date"
                    placeholder="Check-out *"
                    value={newBooking.checkOut}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, checkOut: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <input
                    type="number"
                    placeholder="Nights"
                    value={newBooking.nights}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, nights: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Cost (e.g., $500.00) *"
                    value={newBooking.cost}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, cost: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  onClick={() => setShowAddBookingForm(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddManualBooking}
                  className="save-btn"
                >
                  Add Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}