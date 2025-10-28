// context/NotificationsContext.jsx
import React, { createContext, useState, useContext } from "react";

const NotificationsContext = createContext();

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notif) => {
    setNotifications((prev) => [notif, ...prev]);
  };

  const clearNotifications = () => setNotifications([]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, addNotification, clearNotifications }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
