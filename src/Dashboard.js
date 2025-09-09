import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import CalendarView from './CalendarView';
import './Dashboard.css';

export default function Dashboard({ user, setBookingData }) {
  const [resort, setResort] = useState("");
  const [unitType, setUnitType] = useState("");
  const [guests, setGuests] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resortOptions, setResortOptions] = useState([]);
  const [unitTypeOptions, setUnitTypeOptions] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Set active tab based on current route
  useEffect(() => {
    const pathname = location.pathname;
    console.log('Current pathname:', pathname);
    
    if (pathname === '/dashboard') {
      setActiveTab('home');
      console.log('Setting activeTab to home');
    }
  }, [location.pathname]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:4000/api/availability");
        const json = await res.json();
        console.log('Raw data from API:', json);
        setData(json);
        
        // Extract unique resorts and unit types
        const resorts = [...new Set(json.map(item => item.resort))];
        const unitTypes = [...new Set(json.map(item => item.unitType))];
        
        console.log('Extracted resorts:', resorts);
        console.log('Extracted unit types:', unitTypes);
        
        setResortOptions(resorts);
        setUnitTypeOptions(unitTypes);
        
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // FIXED: Better date parsing that handles timezones correctly
  const parseAvailabilityDate = (dateString) => {
    console.log(`Parsing date string: ${dateString}`);
    
    if (dateString instanceof Date) {
      // Already a date object, just ensure it's at midnight local time
      const localDate = new Date(dateString.getFullYear(), dateString.getMonth(), dateString.getDate());
      console.log(`Date object converted to local: ${localDate}`);
      return localDate;
    }
    
    if (typeof dateString === 'string') {
      // Handle ISO strings (from the backend)
      if (dateString.includes('T') || dateString.includes('Z')) {
        const parsed = new Date(dateString);
        // Convert to local midnight to avoid timezone issues
        const localDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        console.log(`ISO string ${dateString} converted to local: ${localDate}`);
        return localDate;
      }
      
      // Handle date range strings like "9/23-9/25"
      if (dateString.includes('/')) {
        const [month, day] = dateString.split('/');
        const year = new Date().getFullYear(); // Current year
        const localDate = new Date(year, parseInt(month) - 1, parseInt(day));
        console.log(`Date range ${dateString} converted to local: ${localDate}`);
        return localDate;
      }
    }
    
    console.warn(`Could not parse date: ${dateString}`);
    return null;
  };

  // FIXED: Improved search logic
  const handleSearch = () => {
    console.log('=== BUTTON CLICKED ===');
    console.log('Button clicked with flexibleDates:', flexibleDates);
    
    if (flexibleDates) {
      setActiveTab('calendar');
      return;
    }

    // Validate required fields for specific date search
    if (!checkIn || !checkOut) {
      alert('Please select both check-in and check-out dates');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const requestedNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    console.log('Searching for matches:');
    console.log(`Check-in: ${checkIn} -> ${checkInDate}`);
    console.log(`Check-out: ${checkOut} -> ${checkOutDate}`);
    console.log(`Nights: ${requestedNights}`);

    // Process the data to remove already booked dates and find matches
    const processedData = processBookingData(data);
    console.log('Available data to search:', processedData);

    const matches = processedData.filter(availability => {
      console.log('RAW AVAILABILITY OBJECT:', availability);
      console.log(`startDate: ${availability.startDate} type: ${typeof availability.startDate}`);
      console.log(`endDate: ${availability.endDate} type: ${typeof availability.endDate}`);
      console.log(`dateRange: ${availability.dateRange}`);

      // Parse availability dates
      const availStart = parseAvailabilityDate(availability.startDate);
      const availEnd = parseAvailabilityDate(availability.endDate);

      if (!availStart || !availEnd) {
        console.log('Could not parse availability dates, skipping');
        return false;
      }

      console.log(`Final parsed dates: ${availStart} to ${availEnd}`);

      // Check if requested dates fall within available dates
      const datesMatch = checkInDate >= availStart && checkOutDate <= availEnd;
      
      // Check minimum stay requirement
      const minStayMet = requestedNights >= availability.minStayDays;

      console.log(`Checking ${availability.resort} ${availability.unitType}:`);
      console.log(`  Available: ${availStart.toDateString()} to ${availEnd.toDateString()}`);
      console.log(`  Requested: ${checkInDate.toDateString()} to ${checkOutDate.toDateString()}`);
      console.log(`  Dates match: ${datesMatch}`);
      console.log(`  Min stay (${availability.minStayDays}): ${minStayMet}`);
      console.log(`  Final result: ${datesMatch && minStayMet}`);

      return datesMatch && minStayMet;
    });

    console.log('Raw matches found:', matches);

    // Apply additional filters
    let filteredMatches = [...matches];

    if (resort) {
      filteredMatches = filteredMatches.filter(item => item.resort === resort);
    }

    console.log('After resort filter:', filteredMatches);

    if (unitType) {
      filteredMatches = filteredMatches.filter(item => item.unitType.includes(unitType));
    }

    if (guests) {
      filteredMatches = filteredMatches.filter(item => {
        const guestCount = parseInt(guests);
        if (guestCount <= 2 && item.unitType.includes("1 bedroom")) return true;
        if (guestCount <= 4 && item.unitType.includes("2 bedroom")) return true;
        if (guestCount <= 6 && item.unitType.includes("3 bedroom")) return true;
        if (guestCount === 1) return true;
        return false;
      });
    }

    console.log('Final matches:', filteredMatches);

    setSearchResults(filteredMatches);
    setShowResults(true);
  };

  // FIXED: Better processing to extract minimum stay days
  const processBookingData = (rawData) => {
    const processedData = rawData.map(booking => {
      // Extract minimum stay from usage field (like "4D" = 4 days)
      const minStayDays = extractMinStayDays(booking.usage);
      
      return {
        ...booking,
        minStayDays,
        // Ensure dates are properly parsed
        startDate: parseAvailabilityDate(booking.startDate),
        endDate: parseAvailabilityDate(booking.endDate)
      };
    });

    console.log('Processed data:', processedData);
    
    // Filter out bookings that are already booked (status indicates booking)
    const availableData = processedData.filter(booking => {
      // If the status field contains account codes like 'V', 'A', 'JA', etc., it's booked
      const isBooked = booking.status && booking.status.trim() !== '' && 
                      !booking.status.toLowerCase().includes('available') &&
                      !booking.status.toLowerCase().includes('open');
      return !isBooked;
    });

    console.log('Filtered data (after removing booked dates):', availableData);
    return availableData;
  };

  const extractMinStayDays = (usage) => {
    if (!usage) return 1;
    
    // Look for patterns like "4D", "3D", "2D" in the usage string
    const match = usage.match(/(\d+)D/i);
    const minStay = match ? parseInt(match[1]) : 1;
    
    console.log(`Extracted min stay from "${usage}": ${minStay} days`);
    return minStay;
  };

  const handleBooking = (selectedDates, availabilityItem) => {
    const bookingInfo = {
      resort: availabilityItem.resort,
      unitType: availabilityItem.unitType,
      checkIn: selectedDates.start.toLocaleDateString(),
      checkOut: selectedDates.end.toLocaleDateString(),
      nights: Math.ceil((selectedDates.end - selectedDates.start) / (1000 * 60 * 60 * 24)),
      cost: calculateCost(selectedDates, availabilityItem),
      dateRange: `${selectedDates.start.getMonth() + 1}/${selectedDates.start.getDate()}-${selectedDates.end.getMonth() + 1}/${selectedDates.end.getDate()}`
    };
    
    setBookingData(bookingInfo);
    navigate('/booking-confirmation');
  };

  const calculateCost = (selectedDates, availabilityItem) => {
    const nights = Math.ceil((selectedDates.end - selectedDates.start) / (1000 * 60 * 60 * 24));
    const baseCostStr = availabilityItem.cost.replace('$', '').replace(',', '');
    const baseCost = parseFloat(baseCostStr);
    const perNightRate = baseCost / availabilityItem.nights;
    return `$${(perNightRate * nights).toFixed(2)}`;
  };

  const handleDirectBooking = (availability) => {
    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates first');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    const bookingInfo = {
      resort: availability.resort,
      unitType: availability.unitType,
      checkIn: checkInDate.toLocaleDateString(),
      checkOut: checkOutDate.toLocaleDateString(),
      nights,
      cost: calculateCost({ start: checkInDate, end: checkOutDate }, availability),
      dateRange: `${checkInDate.getMonth() + 1}/${checkInDate.getDate()}-${checkOutDate.getMonth() + 1}/${checkOutDate.getDate()}`
    };
    
    setBookingData(bookingInfo);
    navigate('/booking-confirmation');
  };

  console.log('Current activeTab:', activeTab);

  // Calendar view for flexible dates
  if (activeTab === 'calendar') {
    const processedData = processBookingData(data);
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="user-welcome">
            <h2>Welcome, {user?.email}</h2>
          </div>
          <nav className="main-nav">
            <button 
              onClick={() => setActiveTab('home')}
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Back to Search
            </button>
            <button 
              onClick={() => navigate('/my-bookings')}
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              My Bookings
            </button>
            <button 
              onClick={() => navigate('/messages')}
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Messages
            </button>
            <a href="/" className="nav-link">Log out</a>
          </nav>
        </header>

        <main className="results-section">
          <h3 className="results-title">Select Your Dates</h3>
          
          {loading ? (
            <div className="loading-message">Loading available units...</div>
          ) : processedData.length > 0 ? (
            <CalendarView 
              availabilityData={processedData}
              onBooking={handleBooking}
            />
          ) : (
            <div className="no-results">
              No available units found
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-welcome">
          <h2>Welcome, {user?.email}</h2>
        </div>
        <nav className="main-nav">
          <span className="nav-link active">Home</span>
          <button 
            onClick={() => navigate('/my-bookings')}
            className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            My Bookings
          </button>
          <button 
            onClick={() => navigate('/messages')}
            className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Messages
          </button>
          <a href="/" className="nav-link">Log out</a>
        </nav>
      </header>

      <section className="search-section">
        <div className="search-controls">
          <div className="filter-group">
            <label htmlFor="resort-select">Resort</label>
            <select 
              id="resort-select"
              value={resort}
              onChange={(e) => setResort(e.target.value)} 
              className="form-select"
            >
              <option value="">All Resorts</option>
              {resortOptions.map((resort, index) => (
                <option key={index} value={resort}>{resort}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="unit-select">Unit Type</label>
            <select 
              id="unit-select"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)} 
              className="form-select"
            >
              <option value="">All Unit Types</option>
              {unitTypeOptions.map((type, index) => (
                <option key={index} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="guests-select">Number of guests</label>
            <select 
              id="guests-select"
              value={guests}
              onChange={(e) => setGuests(e.target.value)} 
              className="form-select"
            >
              <option value="">Any number</option>
              <option value="1">1 guest</option>
              <option value="2">2 guests</option>
              <option value="3">3 guests</option>
              <option value="4">4 guests</option>
              <option value="5">5 guests</option>
              <option value="6">6 guests</option>
              <option value="7">7 guests</option>
              <option value="8">8+ guests</option>
            </select>
          </div>

          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={flexibleDates}
                onChange={(e) => {
                  console.log('Flexible dates checkbox changed to:', e.target.checked);
                  setFlexibleDates(e.target.checked);
                  if (e.target.checked) {
                    console.log('Clearing date fields');
                    setCheckIn('');
                    setCheckOut('');
                  } else {
                    console.log('Resetting to home state');
                    setActiveTab('home');
                    setShowResults(false);
                  }
                }}
                style={{ marginRight: '0.5rem' }}
              />
              I have flexible dates
            </label>
          </div>

          {!flexibleDates && (
            <>
              <div className="filter-group">
                <label htmlFor="check-in">Check-in Date</label>
                <input
                  id="check-in"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="check-out">Check-out Date</label>
                <input
                  id="check-out"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="form-input"
                />
              </div>
            </>
          )}

          <button 
            onClick={handleSearch}
            className="search-button"
          >
            {flexibleDates ? 'View Calendar' : 'Search Available Units'}
          </button>
        </div>
      </section>

      <main className="results-section">
        {showResults && searchResults.length > 0 ? (
          <>
            <h3 className="results-title">Available Units ({searchResults.length})</h3>
            <div className="units-grid">
              {searchResults.map((availability, index) => (
                <div key={index} className="unit-card">
                  <div className="unit-image-container">
                    <img 
                      src={availability.photo || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop&q=80'} 
                      alt={availability.resort}
                      className="unit-image"
                    />
                  </div>
                  <div className="unit-details">
                    <h4>{availability.resort}</h4>
                    <p className="unit-type">{availability.unitType}</p>
                    
                    <div className="unit-dates">
                      Available: {availability.dateRange}
                    </div>
                    
                    <div className="unit-price">
                      {availability.cost} ({availability.nights} nights)
                    </div>
                    
                    <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                      Minimum stay: {availability.minStayDays} nights
                    </p>
                    
                    <div className="unit-actions">
                      {availability.link && (
                        <a 
                          href={availability.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="airbnb-link"
                        >
                          View Details
                        </a>
                      )}
                      <button 
                        onClick={() => handleDirectBooking(availability)}
                        className="book-button"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : showResults && searchResults.length === 0 ? (
          <div className="no-results">
            <h3>No available units found</h3>
            <p>Try adjusting your search criteria or select flexible dates to view the calendar.</p>
          </div>
        ) : (
          <div className="no-results">
            <h3>Search for Available Units</h3>
            <p>Use the search form above to find available accommodations.</p>
          </div>
        )}
      </main>
    </div>
  );
}