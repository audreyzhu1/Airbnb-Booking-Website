import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

export default function ChatInterface({ user, userBookings, isAdminView = false, onClose = null }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Load messages from localStorage only
  useEffect(() => {
    const savedMessages = localStorage.getItem('worldmark-messages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]); // Start with empty array if error
      }
    } else {
      // Start with completely empty messages
      setMessages([]);
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('worldmark-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedConversation]);

  // Calculate unread messages
  useEffect(() => {
    if (isAdminView) {
      const unread = messages.filter(msg => 
        msg.senderType === 'customer' && !msg.isRead
      ).length;
      setUnreadCount(unread);
    } else {
      const unread = messages.filter(msg => 
        msg.senderType === 'admin' && !msg.isRead && 
        messages.some(customerMsg => 
          customerMsg.bookingId === msg.bookingId && 
          customerMsg.sender === user?.email
        )
      ).length;
      setUnreadCount(unread);
    }
  }, [messages, user, isAdminView]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      sender: user?.email,
      senderType: isAdminView ? 'admin' : 'customer',
      message: newMessage.trim(),
      bookingId: selectedConversation.bookingId,
      isRead: false
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    console.log(`📧 Notification: New message from ${user?.email}`);
  };

  const markConversationAsRead = (bookingId) => {
    setMessages(prev => 
      prev.map(msg => {
        if (msg.bookingId === bookingId) {
          if (isAdminView && msg.senderType === 'customer') {
            return { ...msg, isRead: true };
          } else if (!isAdminView && msg.senderType === 'admin') {
            return { ...msg, isRead: true };
          }
        }
        return msg;
      })
    );
  };

  const getConversations = () => {
    const conversations = [];
    const conversationMap = new Map();

    // Group messages by booking
    messages.forEach(msg => {
      if (!conversationMap.has(msg.bookingId)) {
        conversationMap.set(msg.bookingId, []);
      }
      conversationMap.get(msg.bookingId).push(msg);
    });

    // Create conversation objects
    conversationMap.forEach((msgs, bookingId) => {
      const booking = userBookings[bookingId - 1];
      if (!booking) return;

      // Filter access based on user type
      if (!isAdminView && booking.userEmail !== user?.email) return;

      const sortedMsgs = msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const lastMessage = sortedMsgs[0];
      const unreadCount = msgs.filter(msg => {
        if (isAdminView) {
          return msg.senderType === 'customer' && !msg.isRead;
        } else {
          return msg.senderType === 'admin' && !msg.isRead;
        }
      }).length;

      conversations.push({
        bookingId,
        booking,
        lastMessage,
        unreadCount,
        messageCount: msgs.length
      });
    });

    return conversations.sort((a, b) => 
      new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );
  };

  const getConversationMessages = () => {
    if (!selectedConversation) return [];
    
    return messages
      .filter(msg => msg.bookingId === selectedConversation.bookingId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateMessage = (message, maxLength = 50) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const conversations = getConversations();
  const conversationMessages = getConversationMessages();

  return (
    <div className="chat-interface-wrapper">
      {onClose && (
        <div className="chat-header">
          <h3>Messages {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}</h3>
          <button onClick={onClose} className="close-chat-btn">✕</button>
        </div>
      )}

      <div className="chat-layout">
        {/* Left Sidebar - Conversations */}
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h4>Conversations</h4>
            {isAdminView && (
              <span className="total-conversations">{conversations.length}</span>
            )}
          </div>

          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <div className="no-conversations-icon">💬</div>
                <p>No conversations yet</p>
                <p className="no-conversations-sub">
                  {isAdminView ? 'Customer messages will appear here' : 'Start a conversation about your booking'}
                </p>
              </div>
            ) : (
              conversations.map(conv => (
                <div 
                  key={conv.bookingId}
                  className={`conversation-item ${selectedConversation?.bookingId === conv.bookingId ? 'active' : ''} ${conv.unreadCount > 0 ? 'has-unread' : ''}`}
                  onClick={() => {
                    setSelectedConversation(conv);
                    markConversationAsRead(conv.bookingId);
                  }}
                >
                  <div className="conversation-header">
                    <div className="booking-info">
                      <span className="booking-id">#{conv.bookingId}</span>
                      <span className="resort-name">{conv.booking.resort}</span>
                    </div>
                    <div className="conversation-meta">
                      {conv.unreadCount > 0 && (
                        <span className="unread-count">{conv.unreadCount}</span>
                      )}
                      <span className="last-message-time">
                        {formatTimestamp(conv.lastMessage.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="customer-name">
                    {conv.booking.guestInfo?.firstName && conv.booking.guestInfo?.lastName 
                      ? `${conv.booking.guestInfo.firstName} ${conv.booking.guestInfo.lastName}` 
                      : conv.booking.userEmail}
                  </div>
                  
                  <div className="last-message-preview">
                    <span className={`message-sender ${conv.lastMessage.senderType}`}>
                      {conv.lastMessage.senderType === 'admin' ? '👨‍💼' : '👤'}
                    </span>
                    <span className="message-text">
                      {truncateMessage(conv.lastMessage.message)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Chat Messages */}
        <div className="chat-panel">
          {selectedConversation ? (
            <>
              <div className="chat-panel-header">
                <div className="conversation-title">
                  <h4>#{selectedConversation.bookingId} - {selectedConversation.booking.resort}</h4>
                  <div className="conversation-details">
                    <span>{selectedConversation.booking.guestInfo?.firstName} {selectedConversation.booking.guestInfo?.lastName}</span>
                    <span>•</span>
                    <span>{selectedConversation.booking.checkIn} to {selectedConversation.booking.checkOut}</span>
                  </div>
                </div>
              </div>

              <div className="messages-container">
                <div className="messages-list">
                  {conversationMessages.map(message => {
                    // Determine if this message is from the current user based on their login
                    let isCurrentUser = false;
                    
                    if (isAdminView) {
                      // If admin is viewing: admin messages = current user (right), customer messages = other user (left)
                      isCurrentUser = message.senderType === 'admin';
                    } else {
                      // If customer is viewing: customer messages = current user (right), admin messages = other user (left)
                      isCurrentUser = message.senderType === 'customer';
                    }
                    
                    const messageClass = isCurrentUser ? 'current-user' : 'other-user';
                    
                    return (
                      <div 
                        key={message.id} 
                        className={`message ${messageClass}`}
                      >
                        <div className="message-bubble">
                          <div className="message-content">{message.message}</div>
                          <div className="message-time">{formatMessageTime(message.timestamp)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="message-compose">
                <div className="compose-input-area">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Type your message about Booking #${selectedConversation.bookingId}...`}
                    className="message-input"
                    rows="3"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="send-btn"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-conversation-selected">
              <div className="select-conversation-prompt">
                <div className="prompt-icon">💬</div>
                <h4>Select a conversation</h4>
                <p>Choose a booking conversation from the sidebar to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

