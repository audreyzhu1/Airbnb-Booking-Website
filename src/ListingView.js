import React, { useState } from 'react';
import './ListingView.css';

export default function ListingView({ availabilityData, onBooking }) {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [selectedNights, setSelectedNights] = useState('');

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDateInput = (date) => {
    return new Date(date).toISOString().split('T')[0];
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
    // Clear previous selections when opening modal
    setCheckInDate('');
    setCheckOutDate('');
    setSelectedNights('');
  };

  const handleCloseModal = () => {
    setSelectedPeriod(null);
    setCheckInDate('');
    setCheckOutDate('');
    setSelectedNights('');
  };

  const handleCheckInChange = (date) => {
    console.log("🔍 Check-in date changed:", date);
    setCheckInDate(date);
    if (checkOutDate) {
      const nights = calculateNights(date, checkOutDate);
      setSelectedNights(nights.toString());
      console.log("🔍 Updated nights:", nights);
    }
  };

  const handleCheckOutChange = (date) => {
    console.log("🔍 Check-out date changed:", date);
    setCheckOutDate(date);
    if (checkInDate) {
      const nights = calculateNights(checkInDate, date);
      setSelectedNights(nights.toString());
      console.log("🔍 Updated nights:", nights);
    }
  };

  const handleNightsChange = (nights) => {
    console.log("🔍 Nights changed:", nights);
    setSelectedNights(nights);
    if (checkInDate && nights) {
      const start = new Date(checkInDate);
      const end = new Date(start);
      end.setDate(start.getDate() + parseInt(nights));
      const newCheckOut = formatDateInput(end);
      console.log("🔍 Calculated new check-out:", newCheckOut);
      setCheckOutDate(newCheckOut);
    }
  };

  const isDateInRange = (date, period) => {
    const targetDate = new Date(date);
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    // Set all dates to same time for proper comparison
    targetDate.setHours(12, 0, 0, 0);
    startDate.setHours(12, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);
    
    return targetDate >= startDate && targetDate <= endDate;
  };

  const isValidSelection = () => {
    if (!selectedPeriod || !checkInDate || !checkOutDate) return false;
    
    const nights = calculateNights(checkInDate, checkOutDate);
    
    // Parse dates as YYYY-MM-DD strings directly to avoid timezone issues
    const checkInStr = checkInDate; // Already in YYYY-MM-DD format
    const checkOutStr = checkOutDate; // Already in YYYY-MM-DD format
    
    // Get available period dates and format them consistently
    const availStart = new Date(selectedPeriod.startDate);
    const availEnd = new Date(selectedPeriod.endDate);
    
    const availStartStr = availStart.getFullYear() + '-' + 
      String(availStart.getMonth() + 1).padStart(2, '0') + '-' + 
      String(availStart.getDate()).padStart(2, '0');
    const availEndStr = availEnd.getFullYear() + '-' + 
      String(availEnd.getMonth() + 1).padStart(2, '0') + '-' + 
      String(availEnd.getDate()).padStart(2, '0');
    
    console.log("🔍 Validation check (string comparison):");
    console.log("Check-in:", checkInStr);
    console.log("Check-out:", checkOutStr);
    console.log("Available start:", availStartStr);
    console.log("Available end:", availEndStr);
    
    // Use string comparison to avoid date parsing issues
    if (checkInStr < availStartStr || checkInStr > availEndStr) {
      console.log("❌ Check-in date outside available period");
      return false;
    }
    
    if (checkOutStr < availStartStr || checkOutStr > availEndStr) {
      console.log("❌ Check-out date outside available period");
      return false;
    }
    
    // Check minimum stay requirement
    if (nights < selectedPeriod.minStayDays) {
      console.log("❌ Doesn't meet minimum stay requirement");
      return false;
    }
    
    // Check if check-out is after check-in
    if (checkOutStr <= checkInStr) {
      console.log("❌ Check-out not after check-in");
      return false;
    }
    
    console.log("✅ Valid selection");
    return true;
  };

  const handleBooking = () => {
    console.log("🔍 Booking attempt with:");
    console.log("checkInDate:", checkInDate);
    console.log("checkOutDate:", checkOutDate);
    console.log("selectedPeriod:", selectedPeriod);
    
    if (!isValidSelection()) {
      alert('Please select valid dates within the available period that meet the minimum stay requirement.');
      return;
    }

    // Create Date objects directly from the input strings (YYYY-MM-DD format)
    const selectedDates = {
      start: new Date(checkInDate + 'T12:00:00'), // Add time to avoid timezone issues
      end: new Date(checkOutDate + 'T12:00:00')
    };

    console.log("🔍 Passing to onBooking:", selectedDates);
    onBooking(selectedDates, selectedPeriod);
  };

  const calculateCost = (nights) => {
    if (!selectedPeriod || !nights) return '$0.00';
    
    const baseCostStr = selectedPeriod.cost.replace('$', '').replace(',', '');
    const baseCost = parseFloat(baseCostStr);
    const originalNights = selectedPeriod.nights;
    const perNightRate = baseCost / originalNights;
    
    return `$${(perNightRate * nights).toFixed(2)}`;
  };

  const getMaxDate = (period) => {
    const endDate = new Date(period.endDate);
    // Subtract minimum stay to ensure we don't allow selections that would extend beyond the period
    endDate.setDate(endDate.getDate() - period.minStayDays + 1);
    return formatDateInput(endDate);
  };

  return (
    <div className="listing-view">
      <div className="availability-header">
        <h3>Available Periods</h3>
        <p>Select an availability period and choose your exact dates within that timeframe.</p>
      </div>

      <div className="availability-list">
        {availabilityData.map((period, index) => (
          <div 
            key={index} 
            className={`availability-card ${selectedPeriod === period ? 'selected' : ''}`}
            onClick={() => handlePeriodSelect(period)}
          >
            <div className="period-header">
              <h4>{period.resort} - {period.unitType}</h4>
              <span className="period-dates">
                {formatDate(period.startDate)} - {formatDate(period.endDate)}
              </span>
            </div>
            
            <div className="period-details">
              <p className="availability-text">
                This unit is available from <strong>{formatDate(period.startDate)}</strong> to <strong>{formatDate(period.endDate)}</strong>. 
                You can book any <strong>{period.minStayDays}+ days</strong> within this timeframe.
              </p>
              
              <div className="period-info">
                <span className="min-stay">Min stay: {period.minStayDays} days</span>
                <span className="base-cost">Base rate: {period.cost} for {period.nights} nights</span>
              </div>

              {period.link && (
                <a 
                  href={period.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="property-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Property Details →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedPeriod && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h4>Book Your Stay</h4>
              <button 
                onClick={handleCloseModal}
                className="close-modal-btn"
              >
                ✕
              </button>
            </div>
            
            <p className="booking-period">
              Selected Period: {formatDate(selectedPeriod.startDate)} - {formatDate(selectedPeriod.endDate)}
            </p>

            <div className="date-selection">
              <div className="date-input-group">
                <label htmlFor="check-in">Check-in Date</label>
                <input
                  id="check-in"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  min={formatDateInput(selectedPeriod.startDate)}
                  max={getMaxDate(selectedPeriod)}
                  className="date-input"
                />
              </div>

              <div className="date-input-group">
                <label htmlFor="nights">Number of Nights</label>
                <select
                  id="nights"
                  value={selectedNights}
                  onChange={(e) => handleNightsChange(e.target.value)}
                  className="nights-select"
                >
                  <option value="">Select nights</option>
                  {Array.from({ length: 15 }, (_, i) => selectedPeriod.minStayDays + i)
                    .filter(nights => checkInDate ? 
                      new Date(checkInDate).getTime() + (nights * 24 * 60 * 60 * 1000) <= new Date(selectedPeriod.endDate).getTime()
                      : true
                    )
                    .map(nights => (
                      <option key={nights} value={nights}>
                        {nights} night{nights !== 1 ? 's' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="date-input-group">
                <label htmlFor="check-out">Check-out Date</label>
                <input
                  id="check-out"
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => handleCheckOutChange(e.target.value)}
                  min={checkInDate ? formatDateInput(new Date(new Date(checkInDate).getTime() + (selectedPeriod.minStayDays * 24 * 60 * 60 * 1000))) : ''}
                  max={formatDateInput(selectedPeriod.endDate)}
                  className="date-input"
                  disabled={!checkInDate}
                />
              </div>
            </div>

            {checkInDate && checkOutDate && (
              <div className="booking-summary">
                <div className="summary-row">
                  <span>Check-in:</span>
                  <span>{checkInDate}</span>
                </div>
                <div className="summary-row">
                  <span>Check-out:</span>
                  <span>{checkOutDate}</span>
                </div>
                <div className="summary-row">
                  <span>Nights:</span>
                  <span>{calculateNights(checkInDate, checkOutDate)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total Cost:</span>
                  <span>{calculateCost(calculateNights(checkInDate, checkOutDate))}</span>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button 
                onClick={handleCloseModal}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleBooking}
                disabled={!isValidSelection()}
                className="book-button"
              >
                Book This Stay
              </button>
            </div>

            {!isValidSelection() && checkInDate && checkOutDate && (
              <p className="validation-message">
                {(() => {
                  const nights = calculateNights(checkInDate, checkOutDate);
                  
                  // Use the same string comparison logic as validation
                  const checkInStr = checkInDate;
                  const checkOutStr = checkOutDate;
                  
                  const availStart = new Date(selectedPeriod.startDate);
                  const availEnd = new Date(selectedPeriod.endDate);
                  
                  const availStartStr = availStart.getFullYear() + '-' + 
                    String(availStart.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(availStart.getDate()).padStart(2, '0');
                  const availEndStr = availEnd.getFullYear() + '-' + 
                    String(availEnd.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(availEnd.getDate()).padStart(2, '0');
                  
                  if (checkInStr < availStartStr) {
                    return `Check-in date must be ${formatDate(selectedPeriod.startDate)} or later`;
                  }
                  if (checkInStr > availEndStr) {
                    return `Check-in date must be ${formatDate(selectedPeriod.endDate)} or earlier`;
                  }
                  if (checkOutStr > availEndStr) {
                    return `Check-out date must be ${formatDate(selectedPeriod.endDate)} or earlier`;
                  }
                  if (checkOutStr < availStartStr) {
                    return `Check-out date must be ${formatDate(selectedPeriod.startDate)} or later`;
                  }
                  if (nights < selectedPeriod.minStayDays) {
                    return `Minimum stay is ${selectedPeriod.minStayDays} nights`;
                  }
                  if (checkOutStr <= checkInStr) {
                    return 'Check-out must be after check-in date';
                  }
                  return 'Please select valid dates within the available period';
                })()}
              </p>
            )}
          </div>
        </div>
      )}

      {availabilityData.length === 0 && (
        <div className="no-availability">
          <div className="no-availability-icon">📅</div>
          <h3>No availability found</h3>
          <p>There are no available periods matching your criteria. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}