import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Bell, Check, Trash2, Clock, Music, User } from "lucide-react";

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [show, setShow] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        fetchNotifications(session.user.id);
        subscribeToNotifications(session.user.id);
      }
    };
    init();
  }, []);

  const fetchNotifications = async (userId) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (!error) {
      setNotifications(data || []);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const subscribeToNotifications = (userId) => {
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          setUnreadCount(count => count + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(count => Math.max(0, count - 1));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);
    
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return (
    <div className="position-relative">
      <button 
        className="btn btn-link text-secondary p-2 position-relative shadow-none border-0"
        onClick={() => setShow(!show)}
      >
        <Bell size={24} className={unreadCount > 0 ? "text-warning" : "text-secondary"} />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
            {unreadCount}
          </span>
        )}
      </button>

      {show && (
        <>
          <div 
            className="position-fixed top-0 start-0 w-100 h-100" 
            style={{ zIndex: 1040 }} 
            onClick={() => setShow(false)}
          ></div>
          <div 
            className="position-absolute end-0 mt-2 rounded-3 shadow-lg border border-secondary overflow-hidden"
            style={{ width: '320px', background: '#121216', zIndex: 1050 }}
          >
            <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center">
              <h6 className="m-0 fw-bold text-warning text-uppercase small">Notifications</h6>
              {unreadCount > 0 && (
                <button className="btn btn-link text-info p-0 small text-decoration-none" onClick={markAllAsRead}>
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="custom-scrollbar" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.length > 0 ? (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-3 border-bottom border-secondary border-opacity-25 d-flex gap-3 position-relative ${!notif.is_read ? 'bg-warning bg-opacity-10' : ''}`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {notif.type === 'new_track' || notif.type === 'new_upload' ? <Music size={18} className="text-info" /> : 
                       notif.type === 'new_follower' ? <User size={18} className="text-warning" /> : 
                       <Clock size={18} className="text-secondary" />}
                    </div>
                    <div className="flex-grow-1">
                      <p className="small mb-1 text-light">{notif.content}</p>
                      <span className="x-small text-secondary" style={{ fontSize: '0.7rem' }}>
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <div className="rounded-circle bg-warning" style={{ width: 6, height: 6, position: 'absolute', right: 10, top: 20 }}></div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-5 text-center">
                  <p className="text-secondary m-0">No notifications yet.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
