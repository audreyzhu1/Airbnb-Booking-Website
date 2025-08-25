import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import ListingView from './ListingView';  // Changed from CalendarView to ListingView
import ChatInterface from './ChatInterface';
import './Dashboard.css';

export default function Dashboard({ user, setBookingData, userBookings }) {
  const [activeTab, setActiveTab] = useState('home');
  const [resort, setResort] = useState("");
  const [unitType, setUnitType] = useState("");
  const [guests, setGuests] = useState("");
  const [minStayDays, setMinStayDays] = useState("");
  const [maxStayDays, setMaxStayDays] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [data, setData] = useState([]);
  const [mergedAvailability, setMergedAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resortOptions, setResortOptions] = useState([]);
  const [unitTypeOptions, setUnitTypeOptions] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [exactMatches, setExactMatches] = useState([]);
  const [showListingFallback, setShowListingFallback] = useState(false); // Changed from showCalendarFallback
  
  const navigate = useNavigate();
  const location = useLocation();

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
        const res = await fetch("http://localhost:4000/api/availability");
        const json = await res.json();
        console.log("🔍 Raw data from API:", json);
        setData(json);
        
        // ADD DEBUG CODE HERE - RIGHT AFTER GETTING RAW DATA
        console.log("🔍 TOTAL RAW ENTRIES:", json.length);
        
        // Check if August dates are in raw data
        const augustEntries = json.filter(item => {
          const dateRange = item.dateRange || item['Date Range'];
          return dateRange && dateRange.includes('8/');
        });
        console.log("🔍 AUGUST ENTRIES IN RAW DATA:", augustEntries.length);
        console.log("🔍 August entries:", augustEntries);
        
        // Check what date ranges we have
        const allDateRanges = json.map(item => item.dateRange).filter(Boolean);
        console.log("🔍 ALL DATE RANGES:", allDateRanges);
        
        // Check cancel-by dates for August entries
        console.log("🔍 CANCEL-BY DATE CHECK:");
        const currentDate = new Date();
        augustEntries.forEach((item, index) => {
          const cancelDate = new Date(item.cancelByDate);
          console.log(`August entry ${index}: Cancel by ${cancelDate}, Still valid: ${cancelDate > currentDate}`);
        });
        
        // Extract unique resorts and unit types
        const resorts = [...new Set(json.map(item => item.resort))];
        const unitTypes = [...new Set(json.map(item => item.unitType))];
        
        console.log("🔍 Extracted resorts:", resorts);
        console.log("🔍 Extracted unit types:", unitTypes);
        
        setResortOptions(resorts);
        setUnitTypeOptions(unitTypes);
        
        // Process and merge overlapping bookings, then filter out booked dates
        const processed = processBookingData(json);
        console.log("🔍 Processed data:", processed);
        
        // CHECK AUGUST ENTRIES AFTER PROCESSING
        const augustAfterProcessing = processed.filter(item => {
          const dateRange = item.dateRange;
          return dateRange && dateRange.includes('8/');
        });
        console.log("🔍 AUGUST ENTRIES AFTER PROCESSING:", augustAfterProcessing.length);
        console.log("🔍 August after processing:", augustAfterProcessing);
        
        const filtered = filterBookedDates(processed, userBookings);
        console.log("🔍 Filtered data (after removing booked dates):", filtered);
        
        // CHECK AUGUST ENTRIES AFTER FILTERING BOOKED DATES
        const augustAfterFiltering = filtered.filter(item => {
          const dateRange = item.dateRange;
          return dateRange && dateRange.includes('8/');
        });
        console.log("🔍 AUGUST ENTRIES AFTER FILTERING BOOKED DATES:", augustAfterFiltering.length);
        console.log("🔍 August after filtering:", augustAfterFiltering);
        
        setMergedAvailability(filtered);
        
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userBookings]);

  // Filter out booked dates from availability
  const filterBookedDates = (availabilityData, bookings) => {
    if (!bookings || bookings.length === 0) return availabilityData;

    const now = new Date();
    
    // Get all active bookings (confirmed or pending within 24 hours)
    const activeBookings = bookings.filter(booking => {
      if (booking.status === 'confirmed') return true;
      if (booking.status === 'cancelled') return false;
      
      // For pending bookings, check if within 24 hours
      if (booking.status === 'pending' && booking.bookingExpiration) {
        const expiration = new Date(booking.bookingExpiration);
        return now < expiration;
      }
      return false;
    });

    console.log("🔍 Active bookings:", activeBookings);

    return availabilityData.map(availability => {
      // Find bookings that affect this specific availability slot
      const conflictingBookings = activeBookings.filter(booking => 
        booking.originalAvailabilityId === availability.availabilityId
      );

      if (conflictingBookings.length === 0) {
        return availability; // No conflicts, return as-is
      }

      // Get all booked dates for this specific availability slot
      const allBookedDates = conflictingBookings.flatMap(booking => booking.bookedDates);
      const bookedDateSet = new Set(allBookedDates);

      console.log("🔍 Booked dates for availability", availability.availabilityId, ":", allBookedDates);

      // Check if there are any booked dates that overlap with this availability
      const availabilityDates = getDateRange(availability.startDate, availability.endDate);
      const hasConflict = availabilityDates.some(date => bookedDateSet.has(date));

      if (hasConflict) {
        // Any overlap means the entire availability slot becomes unavailable
        return null;
      }

      // No conflicts, return availability as-is
      return availability;
    }).filter(Boolean); // Remove null entries
  };

  // Helper function to get date range
  const getDateRange = (startDate, endDate) => {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Helper function to determine unit count (could be enhanced based on your data)
  const getUnitCount = (availability) => {
    // You might want to add this to your Google Sheets data
    // For now, assume 1 unit per availability slot unless specified
    return availability.unitCount || 1;
  };

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
    
    console.log("🔍 Searching for matches:");
    console.log("Check-in:", checkInDate, "->", checkIn);
    console.log("Check-out:", checkOutDate, "->", checkOut);
    console.log("Nights:", nights);
    console.log("Available data to search:", mergedAvailability);
    
    // Find availabilities that contain the requested date range
    let matches = mergedAvailability.filter(availability => {
      console.log("🔍 RAW AVAILABILITY OBJECT:", availability);
      console.log("🔍 startDate:", availability.startDate, "type:", typeof availability.startDate);
      console.log("🔍 endDate:", availability.endDate, "type:", typeof availability.endDate);
      console.log("🔍 dateRange:", availability.dateRange);
      
      let availStart, availEnd;
      
      // Parse availability dates (they're in ISO format like "2025-08-16T07:00:00.000Z")
      if (availability.startDate && availability.endDate) {
        console.log("🔍 Using startDate and endDate fields");
        
        // Handle ISO format dates
        const parseISODate = (isoString) => {
          console.log("🔍 Parsing ISO date:", isoString);
          const date = new Date(isoString);
          console.log("🔍 Parsed to:", date);
          // Convert to local date (strip time and timezone)
          const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          console.log("🔍 Local date:", localDate);
          return localDate;
        };
        
        availStart = parseISODate(availability.startDate);
        availEnd = parseISODate(availability.endDate);
      } else if (availability.dateRange) {
        console.log("🔍 Using dateRange field");
        // Parse from dateRange like "8/16-8/23"
        const [startPart, endPart] = availability.dateRange.split('-');
        console.log("🔍 Parsing from dateRange:", startPart, "to", endPart);
        
        // Add current year if not present
        const currentYear = new Date().getFullYear();
        const startWithYear = `${startPart}/${currentYear}`;
        const endWithYear = `${endPart}/${currentYear}`;
        
        console.log("🔍 With year added:", startWithYear, "to", endWithYear);
        
        // Parse as M/D/YYYY
        const parseMMDDYYYY = (dateStr) => {
          const [month, day, year] = dateStr.split('/');
          return new Date(year, month - 1, day);
        };
        
        availStart = parseMMDDYYYY(startWithYear);
        availEnd = parseMMDDYYYY(endWithYear);
      } else {
        console.log("🔍 No valid date fields found!");
        return false;
      }
      
      console.log("🔍 Final parsed dates:", availStart, "to", availEnd);
      
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

    console.log("🔍 Raw matches found:", matches);

    // Apply additional filters if specified
    if (resort) {
      matches = matches.filter(item => item.resort === resort);
      console.log("🔍 After resort filter:", matches);
    }
    if (unitType) {
      matches = matches.filter(item => item.unitType.includes(unitType));
      console.log("🔍 After unit type filter:", matches);
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
      console.log("🔍 After guests filter:", matches);
    }

    console.log("🔍 Final matches:", matches);
    setExactMatches(matches);
    setSearchPerformed(true);
    
    if (matches.length === 0) {
      setShowListingFallback(true); // Changed from setShowCalendarFallback
    } else {
      setShowListingFallback(false); // Changed from setShowCalendarFallback
    }
  };

  const resetSearch = () => {
    setSearchPerformed(false);
    setExactMatches([]);
    setShowListingFallback(false); // Changed from setShowCalendarFallback
    setCheckInDate("");
    setCheckOutDate("");
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

  // Process booking data to merge overlapping periods by account
  const processBookingData = (rawData) => {
    // Group by account (second column from your sheet) AND resort/unit type
    const groupedByAccountAndUnit = {};
    
    rawData.forEach((booking, index) => {
      const account = booking.status; // This maps to your "Accou" column
      const unitKey = `${account}_${booking.resort}_${booking.unitType}`;
      
      if (!groupedByAccountAndUnit[unitKey]) {
        groupedByAccountAndUnit[unitKey] = [];
      }
      
      // Add a unique ID for tracking
      groupedByAccountAndUnit[unitKey].push({
        ...booking,
        availabilityId: `${unitKey}_${index}`
      });
    });

    const mergedBookings = [];

    // Process each account+unit group
    Object.keys(groupedByAccountAndUnit).forEach(unitKey => {
      const unitBookings = groupedByAccountAndUnit[unitKey];
      
      // Sort by start date
      unitBookings.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      
      // Merge overlapping/adjacent periods for same account+unit
      const merged = mergeOverlappingPeriods(unitBookings);
      mergedBookings.push(...merged);
    });

    return mergedBookings;
  };

  const mergeOverlappingPeriods = (bookings) => {
    if (bookings.length === 0) return [];

    const merged = [];
    let current = { ...bookings[0] };
    
    // Extract minimum days from usage field
    current.minStayDays = extractMinStayDays(current.usage);

    for (let i = 1; i < bookings.length; i++) {
      const next = bookings[i];
      const currentEnd = new Date(current.endDate);
      const nextStart = new Date(next.startDate);
      
      // Check if periods overlap or are adjacent (within 1 day)
      const daysDifference = (nextStart - currentEnd) / (1000 * 60 * 60 * 24);
      
      if (daysDifference <= 1) {
        // Merge periods - extend current to include next
        current.endDate = new Date(Math.max(new Date(current.endDate), new Date(next.endDate)));
        current.dateRange = formatDateRange(current.startDate, current.endDate);
        current.nights = Math.ceil((new Date(current.endDate) - new Date(current.startDate)) / (1000 * 60 * 60 * 24));
        
        // Keep the minimum stay requirement (use the most restrictive)
        const nextMinStay = extractMinStayDays(next.usage);
        current.minStayDays = Math.max(current.minStayDays, nextMinStay);
      } else {
        // No overlap, add current to merged and start new period
        merged.push(current);
        current = { ...next };
        current.minStayDays = extractMinStayDays(current.usage);
      }
    }
    
    merged.push(current);
    return merged;
  };

  const extractMinStayDays = (usage) => {
    if (!usage) return 1;
    const match = usage.match(/(\d+)D/i);
    return match ? parseInt(match[1]) : 1;
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.getMonth() + 1}/${start.getDate()}-${end.getMonth() + 1}/${end.getDate()}`;
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
                      console.log("🔍 Flexible dates checkbox changed to:", e.target.checked);
                      setFlexibleDates(e.target.checked);
                      if (e.target.checked) {
                        console.log("🔍 Clearing date fields");
                        setCheckInDate('');
                        setCheckOutDate('');
                      } else {
                        // When unchecking flexible dates, reset to home state
                        console.log("🔍 Resetting to home state");
                        setSearchPerformed(false);
                        setExactMatches([]);
                        setShowListingFallback(false);
                      }
                    }}
                    style={{ margin: 0 }}
                  />
                  🌟 Flexible Dates - Show All Availability
                </label>
              </div>

              {/* Remove the maximum stay days filter - no longer needed */}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => {
                  console.log("🔍 === BUTTON CLICKED ===");
                  console.log("🔍 Button clicked with flexibleDates:", flexibleDates);
                  
                  // Put the logic directly here to bypass function reference issues
                  if (flexibleDates) {
                    console.log("✅ Flexible dates enabled, showing all availability");
                    const filtered = filterAvailability();
                    console.log("🔍 Filtered results:", filtered);
                    setExactMatches(filtered);
                    setSearchPerformed(true);
                    setShowListingFallback(false);
                    console.log("✅ Flexible search completed successfully");
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