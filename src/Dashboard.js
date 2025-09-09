import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import ListingView from './ListingView';
import ChatInterface from './ChatInterface';
import './Dashboard.css';

export default function Dashboard({ user, setBookingData, userBookings }) {
  const [activeTab, setActiveTab] = useState('home');
  const [resort, setResort] = useState("");
  const [unitType, setUnitType] = useState("");
  const [guests, setGuests] = useState("");
  const [minStayDays, setMinStayDays] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [mergedAvailability, setMergedAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resortOptions, setResortOptions] = useState([]);
  const [unitTypeOptions, setUnitTypeOptions] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [exactMatches, setExactMatches] = useState([]);
  const [showListingFallback, setShowListingFallback] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

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

  // Set activeTab based on current URL when component mounts or URL changes
  useEffect(() => {
    console.log("Current pathname:", location.pathname);
    if (location.pathname === '/messages') {
      console.log("Setting activeTab to messages");
      setActiveTab('messages');
    } else {
      console.log("Setting activeTab to home");
      setActiveTab('home');
    }
  }, [location.pathname]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch("https://worldmark-backend-production.up.railway.app/api/availability");
        const json = await res.json();
        console.log("Raw data from API:", json);
        
        // Extract unique resorts and unit types
        const resorts = [...new Set(json.map(item => item.resort))];
        const unitTypes = [...new Set(json.map(item => item.unitType))];
        
        console.log("Extracted resorts:", resorts);
        console.log("Extracted unit types:", unitTypes);
        
        setResortOptions(resorts);
        setUnitTypeOptions(unitTypes);
        
        // Since backend only returns raw data now, no need for complex processing
        // Just add availabilityId for tracking
        const processedData = json.map((item, index) => ({
          ...item,
          availabilityId: `${item.resort}_${item.unitType}_${index}`
        }));
        
        setMergedAvailability(processedData);
        
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userBookings]);

  // Search for exact matches based on check-in/check-out dates
  const searchExactMatches = () => {
    if (!checkInDate || !checkOutDate) {
      alert("Please select both check-in and check-out dates");
      return;
    }

    // Parse dates as local dates to avoid timezone issues
    const parseLocalDate = (dateString) => {
      const [year, month, day] = dateString.split('-');
      return new Date(year, month - 1, day); // month is 0-indexed
    };

    const checkIn = parseLocalDate(checkInDate);
    const checkOut = parseLocalDate(checkOutDate);
    
    if (checkOut <= checkIn) {
      alert("Check-out date must be after check-in date");
      return;
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    console.log("Searching for matches:");
    console.log("Check-in:", checkInDate, "->", checkIn);
    console.log("Check-out:", checkOutDate, "->", checkOut);
    console.log("Nights:", nights);
    console.log("Available data to search:", mergedAvailability);
    
    // Find availabilities that contain the requested date range
    let matches = mergedAvailability.filter(availability => {
      console.log("RAW AVAILABILITY OBJECT:", availability);
      console.log("dateRange:", availability.dateRange);
      
      // Only parse from dateRange now
      if (!availability.dateRange) {
        console.log("No dateRange found!");
        return false;
      }

      console.log("Using dateRange field:", availability.dateRange);
      
      const { start: availStart, end: availEnd } = parseDateRange(availability.dateRange);
      
      if (!availStart || !availEnd) {
        console.log("Failed to parse dateRange!");
        return false;
      }
      
      console.log("Final parsed dates:", availStart, "to", availEnd);
      
      console.log(`Checking ${availability.resort} ${availability.unitType}:`);
      console.log(`  Available: ${availStart.toDateString()} to ${availEnd.toDateString()}`);
      console.log(`  Requested: ${checkIn.toDateString()} to ${checkOut.toDateString()}`);
      
      // Check if requested dates fall within availability period
      const datesMatch = checkIn >= availStart && checkOut <= availEnd;
      console.log(`  Dates match: ${datesMatch}`);
      
      // Check if meets minimum stay requirement
      const meetsMinStay = nights >= (availability.minStayDays || 1);
      console.log(`  Min stay (${availability.minStayDays || 1}): ${meetsMinStay}`);
      
      const result = datesMatch && meetsMinStay;
      console.log(`  Final result: ${result}`);
      
      return result;
    });

    console.log("Raw matches found:", matches);

    // Apply additional filters if specified
    if (resort) {
      matches = matches.filter(item => item.resort === resort);
      console.log("After resort filter:", matches);
    }
    if (unitType) {
      matches = matches.filter(item => item.unitType.includes(unitType));
      console.log("After unit type filter:", matches);
    }
    if (guests) {
      matches = matches.filter(item => {
        const guestCount = parseInt(guests);
        if (guestCount <= 2 && item.unitType.includes("1 bedroom")) return true;
        if (guestCount <= 4 && item.unitType.includes("2 bedroom")) return true;
        if (guestCount <= 6 && item.unitType.includes("3 bedroom")) return true;
        if (guestCount === 1) return true;
        return false;
      });
      console.log("After guests filter:", matches);
    }

    console.log("Final matches:", matches);
    setExactMatches(matches);
    setSearchPerformed(true);
    
    if (matches.length === 0) {
      setShowListingFallback(true);
    } else {
      setShowListingFallback(false);
    }
  };

  const calculateExactCost = (availability) => {
    if (!checkInDate || !checkOutDate) return availability.cost;
    
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    const baseCostStr = availability.cost.replace('$', '').replace(',', '');
    const baseCost = parseFloat(baseCostStr);
    const perNightRate = baseCost / availability.nights;
    return `$${(perNightRate * nights).toFixed(2)}`;
  };

  const handleDirectBooking = (availability) => {
    if (!checkInDate || !checkOutDate) {
      alert("Please select check-in and check-out dates");
      return;
    }

    const bookingInfo = {
      resort: availability.resort,
      unitType: availability.unitType,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights: Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)),
      cost: calculateExactCost(availability),
      dateRange: `${new Date(checkInDate).getMonth() + 1}/${new Date(checkInDate).getDate()}-${new Date(checkOutDate).getMonth() + 1}/${new Date(checkOutDate).getDate()}`,
      availabilityId: availability.availabilityId
    };
    
    setBookingData(bookingInfo);
    navigate('/booking-confirmation');
  };

  const filterAvailability = () => {
    let filtered = [...mergedAvailability];

    // Filter by resort
    if (resort) {
      filtered = filtered.filter(item => item.resort === resort);
    }

    // Filter by unit type
    if (unitType) {
      filtered = filtered.filter(item => item.unitType.includes(unitType));
    }

    // Filter by guests (based on unit capacity)
    if (guests) {
      filtered = filtered.filter(item => {
        const guestCount = parseInt(guests);
        if (guestCount <= 2 && item.unitType.includes("1 bedroom")) return true;
        if (guestCount <= 4 && item.unitType.includes("2 bedroom")) return true;
        if (guestCount <= 6 && item.unitType.includes("3 bedroom")) return true;
        if (guestCount === 1) return true;
        return false;
      });
    }

    // Filter by minimum stay days - only show if user's desired stay is >= property minimum
    if (minStayDays) {
      const requestedMinStay = parseInt(minStayDays);
      filtered = filtered.filter(item => {
        // User wants at least X days, property requires at least Y days
        // Show property if user's minimum >= property's minimum
        return requestedMinStay >= item.minStayDays;
      });
    }

    return filtered;
  };

  const handleBooking = (selectedDates, availabilityItem) => {
    const bookingInfo = {
      resort: availabilityItem.resort,
      unitType: availabilityItem.unitType,
      checkIn: selectedDates.start.toLocaleDateString(),
      checkOut: selectedDates.end.toLocaleDateString(),
      nights: Math.ceil((selectedDates.end - selectedDates.start) / (1000 * 60 * 60 * 24)),
      cost: calculateCost(selectedDates, availabilityItem),
      dateRange: `${selectedDates.start.getMonth() + 1}/${selectedDates.start.getDate()}-${selectedDates.end.getMonth() + 1}/${selectedDates.end.getDate()}`,
      availabilityId: availabilityItem.availabilityId // Track which availability slot this came from
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

  // Restore search state when returning from booking confirmation
  useEffect(() => {
    if (location.state?.restoreSearch && location.state?.searchState) {
      const { 
        resort: savedResort, 
        unitType: savedUnitType, 
        guests: savedGuests,
        minStayDays: savedMinStayDays
      } = location.state.searchState;
      
      setResort(savedResort);
      setUnitType(savedUnitType);
      setGuests(savedGuests);
      setMinStayDays(savedMinStayDays);
    }
  }, [location.state]);

  const filteredAvailability = filterAvailability();

  console.log("Current activeTab:", activeTab);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-message">Loading available units...</div>
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
          <button 
            onClick={() => {
              console.log("Home button clicked");
              navigate('/dashboard');
            }}
            className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textDecoration: 'none',
              color: activeTab === 'home' ? 'var(--primary)' : 'var(--text-light)',
              fontWeight: activeTab === 'home' ? '600' : '500',
              padding: '0.5rem 0',
              position: 'relative'
            }}
          >
            Home
          </button>
          <button 
            onClick={() => {
              console.log("My Bookings button clicked");
              navigate('/my-bookings');
            }}
            className="nav-link"
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'var(--text-light)',
              fontWeight: '500',
              padding: '0.5rem 0'
            }}
          >
            My Bookings
          </button>
          <button 
            onClick={() => {
              console.log("Messages button clicked");
              navigate('/messages');
            }}
            className={`nav-link ${activeTab === 'messages' ? 'active' : ''}`}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textDecoration: 'none',
              color: activeTab === 'messages' ? 'var(--primary)' : 'var(--text-light)',
              fontWeight: activeTab === 'messages' ? '600' : '500',
              padding: '0.5rem 0',
              position: 'relative'
            }}
          >
            Messages
          </button>
          <button 
            onClick={() => {
              console.log("Log out button clicked");
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
              padding: '0.5rem 0'
            }}
          >
            Log out
          </button>
        </nav>
      </header>

      {activeTab === 'home' && (
        <>
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
                  {resortOptions.map((resortOption, index) => (
                    <option key={index} value={resortOption}>{resortOption}</option>
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
                <label htmlFor="guests-select">How many guests</label>
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
                <label htmlFor="checkin-date">Check-in Date</label>
                <input
                  id="checkin-date"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  disabled={flexibleDates}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="checkout-date">Check-out Date</label>
                <input
                  id="checkout-date"
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="form-input"
                  min={checkInDate || new Date().toISOString().split('T')[0]}
                  disabled={flexibleDates}
                />
              </div>

              <div className="filter-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={flexibleDates}
                    onChange={(e) => {
                      console.log("Flexible dates checkbox changed to:", e.target.checked);
                      setFlexibleDates(e.target.checked);
                      if (e.target.checked) {
                        console.log("Clearing date fields");
                        setCheckInDate('');
                        setCheckOutDate('');
                      } else {
                        // When unchecking flexible dates, reset to home state
                        console.log("Resetting to home state");
                        setSearchPerformed(false);
                        setExactMatches([]);
                        setShowListingFallback(false);
                      }
                    }}
                    style={{ margin: 0 }}
                  />
                  Flexible Dates - Show All Availability
                </label>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => {
                  console.log("=== BUTTON CLICKED ===");
                  console.log("Button clicked with flexibleDates:", flexibleDates);
                  
                  // Put the logic directly here to bypass function reference issues
                  if (flexibleDates) {
                    console.log("Flexible dates enabled, showing all availability");
                    const filtered = filterAvailability();
                    console.log("Filtered results:", filtered);
                    setExactMatches(filtered);
                    setSearchPerformed(true);
                    setShowListingFallback(false);
                    console.log("Flexible search completed successfully");
                  } else {
                    // Call the search function for exact dates
                    if (!checkInDate || !checkOutDate) {
                      alert("Please select both check-in and check-out dates, or check 'Flexible Dates' to see all availability");
                      return;
                    }
                    searchExactMatches();
                  }
                }}
                className="search-button"
              >
                {flexibleDates ? 'Browse All Availability' : 'Search'}
              </button>
            </div>
          </section>

          <main className="results-section">
            {!searchPerformed ? (
              <>
                <h3 className="results-title">Search for Available Accommodations</h3>
                <div className="search-prompt">
                  <p>
                    {flexibleDates 
                      ? "Click 'Browse All Availability' to see all available accommodations with your selected filters."
                      : "Please select your check-in and check-out dates above, then click 'Search Exact Dates' to find available accommodations."
                    }
                  </p>
                </div>
              </>
            ) : (
              <>
                {exactMatches.length > 0 ? (
                  <>
                    <h3 className="results-title">
                      {flexibleDates 
                        ? `Available Accommodations (${exactMatches.length})` 
                        : `Perfect Matches for Your Dates (${exactMatches.length})`
                      }
                    </h3>
                    {flexibleDates ? (
                      <ListingView 
                        availabilityData={exactMatches}
                        onBooking={handleBooking}
                      />
                    ) : (
                      <div className="exact-matches-list">
                        {exactMatches.map((availability, index) => (
                          <div key={index} className="match-card">
                            <div className="match-header">
                              <h4>{availability.resort}</h4>
                              <div className="match-price">{calculateExactCost(availability)}</div>
                            </div>
                            <div className="match-details">
                              <p><strong>Unit Type:</strong> {availability.unitType}</p>
                              <p><strong>Your Dates:</strong> {checkInDate} to {checkOutDate}</p>
                              <p><strong>Duration:</strong> {Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24))} nights</p>
                              {availability.link && (
                                <a href={availability.link} target="_blank" rel="noopener noreferrer" className="airbnb-link">
                                  View Property Details
                                </a>
                              )}
                            </div>
                            <button 
                              onClick={() => handleDirectBooking(availability)}
                              className="book-button"
                            >
                              Book These Dates
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="results-title">
                      {flexibleDates ? 'No Availability Found' : 'No Exact Matches Found'}
                    </h3>
                    <div className="no-exact-matches">
                      <p>
                        {flexibleDates 
                          ? `No availability found matching your selected filters.`
                          : `There is no availability for that ${unitType || 'unit type'}, ${resort || 'resort'}, and dates (${checkInDate} to ${checkOutDate}).`
                        }
                      </p>
                    </div>
                    
                    {!flexibleDates && (
                      <>
                        <h4 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Alternative Availability for Your Selected Filters:</h4>
                        <ListingView 
                          availabilityData={filteredAvailability.filter(item => {
                            let matches = true;
                            if (resort) matches = matches && item.resort === resort;
                            if (unitType) matches = matches && item.unitType.includes(unitType);
                            return matches;
                          })}
                          onBooking={handleBooking}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </>
      )}

      {activeTab === 'messages' && (
        <div style={{ 
          height: 'calc(100vh - 120px)', 
          padding: '2rem',
          paddingTop: '1rem'
        }}>
          <ChatInterface 
            user={user} 
            userBookings={userBookings} 
            isAdminView={false}
          />
        </div>
      )}
    </div>
  );
}