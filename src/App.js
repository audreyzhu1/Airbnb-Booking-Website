// ===== Complete Updated App.js =====
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Dashboard from "./Dashboard";
import BookingConfirmation from "./BookingConfirmation";
import MyBookings from "./MyBookings";
import AdminDashboard from "./AdminDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);

  // Load saved bookings from localStorage on app start
  useEffect(() => {
    const savedBookings = localStorage.getItem('worldmark-bookings');
    if (savedBookings) {
      try {
        const parsedBookings = JSON.parse(savedBookings);
        setUserBookings(parsedBookings);
        console.log("📚 Loaded saved bookings:", parsedBookings);
      } catch (error) {
        console.error("Error loading saved bookings:", error);
      }
    }

    const savedLogs = localStorage.getItem('worldmark-logs');
    if (savedLogs) {
      try {
        const parsedLogs = JSON.parse(savedLogs);
        setSystemLogs(parsedLogs);
      } catch (error) {
        console.error("Error loading saved logs:", error);
      }
    }
  }, []);

  // Save bookings to localStorage whenever userBookings changes
  useEffect(() => {
    if (userBookings.length > 0) {
      localStorage.setItem('worldmark-bookings', JSON.stringify(userBookings));
      console.log("💾 Saved bookings to localStorage:", userBookings);
    }
  }, [userBookings]);

  // Save logs to localStorage whenever systemLogs changes
  useEffect(() => {
    if (systemLogs.length > 0) {
      localStorage.setItem('worldmark-logs', JSON.stringify(systemLogs));
    }
  }, [systemLogs]);

  // Persist user login across page refreshes
  useEffect(() => {
    const savedUser = localStorage.getItem('worldmark-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Save user to localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('worldmark-user', JSON.stringify(user));
    }
  }, [user]);

  const addBooking = (booking) => {
    console.log("🔍 addBooking called with:", booking);
    console.log("🔍 Current user when adding booking:", user);
    
    const newBooking = {
      ...booking,
      userEmail: user?.email,
      bookingDate: new Date().toISOString(),
      status: 'pending',
      bookingId: Date.now() // Add unique ID for tracking
    };
    console.log("🔍 New booking to add:", newBooking);
    
    setUserBookings(prev => {
      const updated = [...prev, newBooking];
      console.log("🔍 Updated userBookings:", updated);
      return updated;
    });

    // Add log entry for new booking
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action: `New booking created by ${user?.email} for ${booking.guestInfo?.firstName} ${booking.guestInfo?.lastName}`,
      admin: user?.email,
      bookingId: newBooking.bookingId
    };
    addLog(logEntry);
  };

  const updateBookingStatus = (bookingIndex, newStatus, newBooking = null) => {
    if (newBooking) {
      // Adding new manual booking
      const bookingWithId = {
        ...newBooking,
        bookingId: Date.now()
      };
      setUserBookings(prev => [...prev, bookingWithId]);
    } else {
      // Updating existing booking status
      setUserBookings(prev => 
        prev.map((booking, index) => 
          index === bookingIndex 
            ? { ...booking, status: newStatus, lastUpdated: new Date().toISOString() }
            : booking
        )
      );
    }
  };

  const addLog = (logEntry) => {
    setSystemLogs(prev => [logEntry, ...prev]);
  };

  // Clear all data function (for testing purposes)
  const clearAllData = () => {
    localStorage.removeItem('worldmark-bookings');
    localStorage.removeItem('worldmark-logs');
    localStorage.removeItem('worldmark-user');
    localStorage.removeItem('worldmark-messages');
    setUserBookings([]);
    setSystemLogs([]);
    setUser(null);
    console.log("🗑️ Cleared all saved data");
  };

  // Add this to window for testing in console
  window.clearWorldMarkData = clearAllData;

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login setUser={setUser} />} />
          <Route 
            path="/dashboard" 
            element={
              user?.type === 'admin' 
                ? <AdminDashboard 
                    user={user} 
                    userBookings={userBookings} 
                    updateBookingStatus={updateBookingStatus}
                    addLog={addLog}
                  />
                : <Dashboard 
                    user={user} 
                    setBookingData={setBookingData} 
                    userBookings={userBookings}
                  />
            } 
          />
          <Route 
            path="/messages" 
            element={
              user?.type === 'admin' 
                ? <AdminDashboard 
                    user={user} 
                    userBookings={userBookings} 
                    updateBookingStatus={updateBookingStatus}
                    addLog={addLog}
                  />
                : <Dashboard 
                    user={user} 
                    setBookingData={setBookingData} 
                    userBookings={userBookings}
                  />
            } 
          />
          <Route 
            path="/booking-confirmation" 
            element={
              <BookingConfirmation 
                bookingData={bookingData} 
                user={user} 
                addBooking={addBooking} 
              />
            } 
          />
          <Route 
            path="/my-bookings" 
            element={
              <MyBookings 
                user={user} 
                userBookings={userBookings} 
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}