import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from 'emailjs-com';
import './BookingConfirmation.css';

export default function BookingConfirmation({ bookingData, user, addBooking }) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    numberOfGuests: ''
  });
  const navigate = useNavigate();

  if (!bookingData) {
    navigate('/dashboard');
    return null;
  }

  const handleInputChange = (field, value) => {
    setGuestInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to generate array of dates between start and end
  const getDateRange = (startDate, endDate) => {
    const dates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate < end) {
      dates.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const sendConfirmationEmails = async (bookingWithGuestInfo) => {
    setEmailSending(true);
    
    try {
      // Email template parameters for customer
      const customerEmailParams = {
        to_email: guestInfo.email,
        to_name: `${guestInfo.firstName} ${guestInfo.lastName}`,
        guest_name: `${guestInfo.firstName} ${guestInfo.lastName}`,
        resort_name: bookingData.resort,
        unit_type: bookingData.unitType,
        check_in_date: bookingData.checkIn,
        check_out_date: bookingData.checkOut,
        nights: bookingData.nights,
        total_cost: bookingData.cost,
        number_of_guests: guestInfo.numberOfGuests,
        booking_date: new Date().toLocaleDateString(),
        venmo_handle: '@JingZhu',
        message: `Your WorldMark booking has been confirmed! Please Venmo ${bookingData.cost} to @JingZhu within 24 hours to secure your reservation.`
      };

      // Email template parameters for admin
      const adminEmailParams = {
        to_email: 'admin@worldmark.com', // Replace with actual admin email
        admin_name: 'Admin',
        guest_name: `${guestInfo.firstName} ${guestInfo.lastName}`,
        guest_email: guestInfo.email,
        resort_name: bookingData.resort,
        unit_type: bookingData.unitType,
        check_in_date: bookingData.checkIn,
        check_out_date: bookingData.checkOut,
        nights: bookingData.nights,
        total_cost: bookingData.cost,
        number_of_guests: guestInfo.numberOfGuests,
        booking_date: new Date().toLocaleDateString(),
        message: `New booking received from ${guestInfo.firstName} ${guestInfo.lastName} (${guestInfo.email})`
      };

      // Send customer confirmation email
      await emailjs.send(
        'service_kgvbpbb', // Replace with your EmailJS service ID
        'template_1xvy3d5', // Customer email template ID
        customerEmailParams,
        'u01hx65yCbRjGPmKY' // Replace with your EmailJS public key
      );

      // Send admin notification email
      await emailjs.send(
        'service_kgvbpbb', // Replace with your EmailJS service ID
        'template_1eoftzg', // Admin email template ID
        adminEmailParams,
        'u01hx65yCbRjGPmKY' // Replace with your EmailJS public key
      );

      console.log('✅ Confirmation emails sent successfully');
      
    } catch (error) {
      console.error('❌ Error sending emails:', error);
      // Don't block the booking if email fails
    } finally {
      setEmailSending(false);
    }
  };

  const handleConfirm = async () => {
    // Validate required fields
    if (!guestInfo.email || !guestInfo.firstName || !guestInfo.lastName || !guestInfo.numberOfGuests) {
      alert('Please fill in all required fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestInfo.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Validate number of guests
    const guests = parseInt(guestInfo.numberOfGuests);
    if (isNaN(guests) || guests < 1 || guests > 20) {
      alert('Please enter a valid number of guests (1-20).');
      return;
    }

    console.log("🔍 handleConfirm called");
    console.log("🔍 addBooking function:", addBooking);
    console.log("🔍 bookingData:", bookingData);
    console.log("🔍 guestInfo:", guestInfo);
    console.log("🔍 user:", user);
    
    // Generate array of booked dates
    const startDate = new Date(bookingData.checkIn);
    const endDate = new Date(bookingData.checkOut);
    const bookedDates = getDateRange(startDate, endDate);
    
    // Add the booking with guest information and booked dates
    if (addBooking && bookingData) {
      console.log("✅ Adding booking...");
      const bookingWithGuestInfo = {
        ...bookingData,
        guestInfo,
        bookedDates, // Array of date strings for easy comparison
        bookingExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        originalAvailabilityId: bookingData.availabilityId // Track which availability slot this came from
      };
      console.log("🔍 Booking with dates:", bookingWithGuestInfo);
      addBooking(bookingWithGuestInfo);

      // Send confirmation emails
      await sendConfirmationEmails(bookingWithGuestInfo);
      
    } else {
      console.log("❌ Missing addBooking or bookingData");
    }
    setIsConfirmed(true);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Payment Instructions Screen
  if (isConfirmed) {
    return (
      <div className="confirmation-container">
        <div className="confirmation-content">
          <div className="success-icon">✅</div>
          <h1>Booking Confirmed!</h1>
          
          <div className="email-confirmation">
            <p><strong>📧 Confirmation email sent to {guestInfo.email}</strong></p>
            <p><em>Please check your email for booking details and payment instructions.</em></p>
          </div>
          
          <div className="payment-instructions">
            <h2>Payment Instructions</h2>
            <div className="payment-box">
              <p><strong>Thank you for confirming. Please Venmo Jing Zhu the payment amount within the next 24 hours to secure your booking.</strong></p>
              
              <div className="payment-details">
                <div className="payment-row">
                  <span>Amount:</span>
                  <span className="amount">{bookingData.cost}</span>
                </div>
                <div className="payment-row">
                  <span>Venmo:</span>
                  <span className="venmo">@JingZhu</span>
                </div>
                <div className="payment-row">
                  <span>Reference:</span>
                  <span>WorldMark - {bookingData.resort}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="booking-summary-small">
            <h3>Booking Summary</h3>
            <p><strong>{bookingData.resort}</strong> - {bookingData.unitType}</p>
            <p>{bookingData.dateRange}</p>
            <p><strong>Guest:</strong> {guestInfo.firstName} {guestInfo.lastName}</p>
            <p><strong>Guests:</strong> {guestInfo.numberOfGuests}</p>
            <p><strong>⏰ Payment Deadline:</strong> 24 hours from now</p>
          </div>

          <button 
            onClick={handleBackToDashboard}
            className="back-dashboard-btn"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Confirmation Screen
  return (
    <div className="confirmation-container">
      <div className="confirmation-content">
        <h1>Confirm Your Booking</h1>
        
        <div className="booking-details">
          <div className="detail-section">
            <h2>Accommodation Details</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Resort:</label>
                <span>{bookingData.resort}</span>
              </div>
              <div className="detail-item">
                <label>Unit Type:</label>
                <span>{bookingData.unitType}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h2>Stay Details</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Check-in:</label>
                <span>{bookingData.checkIn}</span>
              </div>
              <div className="detail-item">
                <label>Check-out:</label>
                <span>{bookingData.checkOut}</span>
              </div>
              <div className="detail-item">
                <label>Duration:</label>
                <span>{bookingData.nights} nights</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h2>Guest Information</h2>
            <div className="guest-form">
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="email">Email Address *</label>
                  <input 
                    id="email"
                    type="email"
                    value={guestInfo.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="form-input"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input 
                    id="firstName"
                    type="text"
                    value={guestInfo.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="form-input"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input 
                    id="lastName"
                    type="text"
                    value={guestInfo.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="form-input"
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="numberOfGuests">Number of Guests *</label>
                  <input
                    id="numberOfGuests"
                    type="number"
                    min="1"
                    max="20"
                    value={guestInfo.numberOfGuests}
                    onChange={(e) => handleInputChange('numberOfGuests', e.target.value)}
                    className="form-input"
                    placeholder="Enter number of guests"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="price-section">
            <div className="price-row">
              <span>Total Amount:</span>
              <span className="total-price">{bookingData.cost}</span>
            </div>
          </div>
        </div>

        <div className="confirmation-actions">
          <button 
            onClick={() => navigate('/dashboard')}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="confirm-btn"
            disabled={emailSending}
          >
            {emailSending ? 'Sending...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}