import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "firebase/auth";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const auth = getAuth();
  const user = auth.currentUser;

  // Load cart from AsyncStorage when app starts
  useEffect(() => {
    const loadCart = async () => {
      if (user) {
        const stored = await AsyncStorage.getItem(`cart_${user.uid}`);
        setCartItems(stored ? JSON.parse(stored) : []);
      }
    };
    loadCart();
  }, [user]);

  const saveCart = async (updatedCart) => {
    setCartItems(updatedCart);
    if (user) {
      await AsyncStorage.setItem(`cart_${user.uid}`, JSON.stringify(updatedCart));
    }
  };

const addToCart = (meal) => {
  const existing = cartItems.find((i) => i.id === meal.id);
  let updated;
  if (existing) {
    updated = cartItems.map((i) =>
      i.id === meal.id
        ? {
            ...i,
            quantity: i.quantity + 1,
            specialInstructions: meal.specialInstructions || i.specialInstructions || "",
          }
        : i
    );
  } else {
    updated = [...cartItems, { ...meal, quantity: 1, specialInstructions: meal.specialInstructions || "" }];
  }
  saveCart(updated);
};



  const removeFromCart = (id) => {
    const updated = cartItems.filter((i) => i.id !== id);
    saveCart(updated);
  };

  const increaseQuantity = (id) => {
    const updated = cartItems.map((i) =>
      i.id === id ? { ...i, quantity: i.quantity + 1 } : i
    );
    saveCart(updated);
  };

  const decreaseQuantity = (id) => {
    let updated = cartItems.map((i) =>
      i.id === id ? { ...i, quantity: i.quantity - 1 } : i
    );
    updated = updated.filter((i) => i.quantity > 0);
    saveCart(updated);
  };

  
  const clearCart = () => {
    setCartItems([]);
  };


  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
