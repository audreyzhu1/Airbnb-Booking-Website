import React, { useState } from 'react';
import './ListingView.css';

export default function ListingView({ availabilityData, onBooking }) {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [selectedNights, setSelectedNights] = useState('');

  // Parse dateRange like "9/23-9/25" into start and end dates
  const parseDateRange = (dateRange) => {
    if (!dateRange || !dateRange.includes('-')) return { start: null, end: null };
    
    const [startPart, endPart] = dateRange.split('-');
    const year = new Date().getFullYear();
    
    // Parse "9/23" as September 23
    const [startMonth, startDay] = startPart.split('/');
    const [endMonth, endDay] = endPart.split('/');
    
    const startDate = new Date(year, parseInt(startMonth) - 1, parseInt(startDay));
    const endDate = new Date(year, parseInt(endMonth) - 1, parseInt(endDay));
    
    return { start: startDate, end: endDate };
  };

  const formatDateInput = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
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
    setCheckInDate(date);
    if (checkOutDate) {
      const nights = calculateNights(date, checkOutDate);
      setSelectedNights(nights.toString());
    }
  };

  const handleCheckOutChange = (date) => {
    setCheckOutDate(date);
    if (checkInDate) {
      const nights = calculateNights(checkInDate, date);
      setSelectedNights(nights.toString());
    }
  };

  const handleNightsChange = (nights) => {
    setSelectedNights(nights);
    if (checkInDate && nights) {
      const start = new Date(checkInDate);
      const end = new Date(start);
      end.setDate(start.getDate() + parseInt(nights));
      const newCheckOut = formatDateInput(end);
      setCheckOutDate(newCheckOut);
    }
  };

  // FIXED: Better date validation logic
  const isValidSelection = () => {
    if (!selectedPeriod || !checkInDate || !checkOutDate) return false;
    
    const nights = calculateNights(checkInDate, checkOutDate);
    const { start: availStart, end: availEnd } = parseDateRange(selectedPeriod.dateRange);
    
    if (!availStart || !availEnd) return false;
    
    // FIXED: Normalize all dates to midnight for proper comparison
    const checkInDateObj = new Date(checkInDate + 'T00:00:00');
    const checkOutDateObj = new Date(checkOutDate + 'T00:00:00');
    const availStartNormalized = new Date(availStart.getFullYear(), availStart.getMonth(), availStart.getDate());
    const availEndNormalized = new Date(availEnd.getFullYear(), availEnd.getMonth(), availEnd.getDate());
    
    console.log('Date validation:');
    console.log(`Check-in: ${checkInDateObj.toDateString()}`);
    console.log(`Check-out: ${checkOutDateObj.toDateString()}`);
    console.log(`Available: ${availStartNormalized.toDateString()} to ${availEndNormalized.toDateString()}`);
    console.log(`Period: ${selectedPeriod.dateRange}`);
    
    // Check if check-out is after check-in
    if (checkOutDateObj <= checkInDateObj) {
      console.log('Check-out must be after check-in');
      return false;
    }
    
    // Check if dates are within available period (inclusive start, inclusive end for checkout)
    if (checkInDateObj < availStartNormalized || checkInDateObj > availEndNormalized) {
      console.log('Check-in date is outside available period');
      return false;
    }
    if (checkOutDateObj < availStartNormalized || checkOutDateObj > availEndNormalized) {
      console.log('Check-out date is outside available period');
      return false;
    }
    
    // Check minimum stay requirement
    if (nights < selectedPeriod.minStayDays) {
      console.log(`Minimum stay not met: ${nights} < ${selectedPeriod.minStayDays}`);
      return false;
    }
    
    console.log('All validations passed');
    return true;
  };

  const handleBooking = () => {
    if (!isValidSelection()) {
      alert('Please select valid dates within the available period that meet the minimum stay requirement.');
      return;
    }

    const selectedDates = {
      start: new Date(checkInDate + 'T12:00:00'),
      end: new Date(checkOutDate + 'T12:00:00')
    };

    console.log('Proceeding with booking:', selectedDates, selectedPeriod);
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
    const { end: availEnd } = parseDateRange(period.dateRange);
    if (!availEnd) return '';
    
    const maxDate = new Date(availEnd);
    maxDate.setDate(maxDate.getDate() - period.minStayDays + 1);
    return formatDateInput(maxDate);
  };

  const getMinDate = (period) => {
    const { start: availStart } = parseDateRange(period.dateRange);
    return availStart ? formatDateInput(availStart) : '';
  };

  const getMaxCheckoutDate = (period) => {
    const { end: availEnd } = parseDateRange(period.dateRange);
    return availEnd ? formatDateInput(availEnd) : '';
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
                {period.dateRange}
              </span>
            </div>
            
            <div className="period-details">
              <p className="availability-text">
                This unit is available from <strong>{period.dateRange}</strong>. 
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
                ×
              </button>
            </div>
            
            <p className="booking-period">
              Selected Period: {selectedPeriod.dateRange}
            </p>

            <div className="date-selection">
              <div className="date-input-group">
                <label htmlFor="check-in">Check-in Date</label>
                <input
                  id="check-in"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  min={getMinDate(selectedPeriod)}
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
                    .filter(nights => {
                      if (!checkInDate) return true;
                      const { end: availEnd } = parseDateRange(selectedPeriod.dateRange);
                      if (!availEnd) return true;
                      
                      const checkoutDate = new Date(checkInDate);
                      checkoutDate.setDate(checkoutDate.getDate() + nights);
                      return checkoutDate <= availEnd;
                    })
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
                  min={checkInDate ? (() => {
                    const minCheckout = new Date(checkInDate);
                    minCheckout.setDate(minCheckout.getDate() + selectedPeriod.minStayDays);
                    return formatDateInput(minCheckout);
                  })() : ''}
                  max={getMaxCheckoutDate(selectedPeriod)}
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
                  
                  if (nights < selectedPeriod.minStayDays) {
                    return `Minimum stay is ${selectedPeriod.minStayDays} nights`;
                  }
                  
                  const { start: availStart, end: availEnd } = parseDateRange(selectedPeriod.dateRange);
                  const checkInDateObj = new Date(checkInDate + 'T00:00:00');
                  const checkOutDateObj = new Date(checkOutDate + 'T00:00:00');
                  const availStartNormalized = new Date(availStart.getFullYear(), availStart.getMonth(), availStart.getDate());
                  const availEndNormalized = new Date(availEnd.getFullYear(), availEnd.getMonth(), availEnd.getDate());
                  
                  if (checkInDateObj < availStartNormalized || checkInDateObj > availEndNormalized || 
                      checkOutDateObj < availStartNormalized || checkOutDateObj > availEndNormalized) {
                    return `Dates must be within available period: ${selectedPeriod.dateRange}`;
                  }
                  
                  if (checkOutDateObj <= checkInDateObj) {
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