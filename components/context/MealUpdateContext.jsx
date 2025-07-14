import React, { createContext, useContext, useState } from 'react';

export const MealUpdateContext = createContext();

export const MealUpdateProvider = ({ children }) => {
  const [updateFlag, setUpdateFlag] = useState(0);

  const triggerMealUpdate = () => setUpdateFlag((prev) => prev + 1);

  return (
    <MealUpdateContext.Provider value={{ updateFlag, triggerMealUpdate }}>
      {children}
    </MealUpdateContext.Provider>
  );
};

export const useMealUpdate = () => useContext(MealUpdateContext);
