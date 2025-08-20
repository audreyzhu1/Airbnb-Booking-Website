import React, { useState } from 'react';
import './CalendarView.css';

export default function CalendarView({ availabilityData, onBooking }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({ start: null, end: null });
  const [selectedAvailability, setSelectedAvailability] = useState(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateAvailable = (date) => {
    if (!date) return false;
    
    return availabilityData.some(item => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      date.setHours(12, 0, 0, 0);
      
      return date >= startDate && date <= endDate;
    });
  };

  const getAvailabilityForDate = (date) => {
    return availabilityData.find(item => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      date.setHours(12, 0, 0, 0);
      
      return date >= startDate && date <= endDate;
    });
  };

  const canSelectDateRange = (start, end, availability) => {
    if (!start || !end || !availability) return false;
    
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return nights >= availability.minStayDays;
  };

  const handleDateClick = (date) => {
    if (!isDateAvailable(date)) {
      alert("This date is unavailable. Only dates shown in green are available.");
      return;
    }
    
    const availability = getAvailabilityForDate(date);
    
    if (!selectedDates.start) {
      // First click - set start date
      setSelectedDates({ start: date, end: null });
      setSelectedAvailability(availability);
    } else if (!selectedDates.end) {
      // Second click - set end date
      if (date < selectedDates.start) {
        // If clicked date is before start, make it the new start date
        setSelectedDates({ start: date, end: null });
        setSelectedAvailability(availability);
      } else if (date.getTime() === selectedDates.start.getTime()) {
        // If clicking the same start date, do nothing (prevent deselection)
        return;
      } else {
        // Check if all dates in the range are available
        const rangeValid = validateDateRange(selectedDates.start, date);
        if (!rangeValid) {
          alert("This date range contains unavailable dates. Only dates shown in green are available.");
          return;
        }
        
        // Check if the range meets minimum stay requirement
        if (canSelectDateRange(selectedDates.start, date, selectedAvailability)) {
          setSelectedDates({ start: selectedDates.start, end: date });
        } else {
          alert(`Minimum stay is ${selectedAvailability.minStayDays} days for this accommodation.`);
        }
      }
    } else {
      // Third click - if clicking outside the selected range, start new selection
      // If clicking within the selected range, do nothing (prevent deselection)
      if (date < selectedDates.start || date > selectedDates.end) {
        setSelectedDates({ start: date, end: null });
        setSelectedAvailability(availability);
      }
      // If clicking within selected range, do nothing
    }
  };

  const validateDateRange = (startDate, endDate) => {
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (!isDateAvailable(currentDate)) {
        return false;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return true;
  };

  const isDateInRange = (date) => {
    if (!selectedDates.start || !selectedDates.end || !date) return false;
    return date >= selectedDates.start && date <= selectedDates.end;
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    return (selectedDates.start && date.getTime() === selectedDates.start.getTime()) ||
           (selectedDates.end && date.getTime() === selectedDates.end.getTime());
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleBooking = () => {
    if (selectedDates.start && selectedDates.end && selectedAvailability) {
      onBooking(selectedDates, selectedAvailability);
    }
  };

  const handleDeselectAll = () => {
    setSelectedDates({ start: null, end: null });
    setSelectedAvailability(null);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={prevMonth} className="nav-button">‹</button>
        <h2>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
        <button onClick={nextMonth} className="nav-button">›</button>
      </div>

      <div className="calendar-controls">
        <button onClick={handleDeselectAll} className="control-button deselect-button">
          Deselect All
        </button>
      </div>

      <div className="calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((date, index) => (
          <div
            key={index}
            className={`calendar-day ${
              date ? (
                isDateAvailable(date) ? 'available' : 'unavailable'
              ) : 'empty'
            } ${
              isDateSelected(date) ? 'selected' : ''
            } ${
              isDateInRange(date) ? 'in-range' : ''
            }`}
            onClick={() => date && handleDateClick(date)}
          >
            {date ? date.getDate() : ''}
          </div>
        ))}
      </div>

      {selectedDates.start && selectedAvailability && (
        <div className="selection-info">
          <div className="selected-property">
            <h3>{selectedAvailability.resort} - {selectedAvailability.unitType}</h3>
            <p>Minimum stay: {selectedAvailability.minStayDays} days</p>
          </div>
          
          {selectedDates.start && selectedDates.end && (
            <div className="selected-dates">
              <p>
                <strong>Selected:</strong> {selectedDates.start.toLocaleDateString()} 
                to {selectedDates.end.toLocaleDateString()}
                ({Math.ceil((selectedDates.end - selectedDates.start) / (1000 * 60 * 60 * 24))} nights)
              </p>
              <button onClick={handleBooking} className="book-selected-btn">
                Book These Dates
              </button>
            </div>
          )}
        </div>
      )}

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color unavailable"></div>
          <span>Unavailable</span>
        </div>
        <div className="legend-item">
          <div className="legend-color selected"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
