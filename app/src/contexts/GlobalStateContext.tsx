import React, { createContext, useReducer } from "react";
import { theme } from "antd";

const initialValues = {
  algorithm: undefined,
  userId: undefined,
  theme: "LIGHT",
};
export const GlobalStateContext = createContext(initialValues);

const reducer = (globalState, action) => {
  switch (action.type) {
    case "THEME":
      return {
        ...globalState,
        theme: action.theme,
        algorithm: action.theme === "DARK" ? theme.darkAlgorithm : theme.algorithm,
      };
    case "LOGIN":
      return { ...globalState, userId: action.userId, userEmail: action.userEmail };
    case "LOGOFF":
      delete globalState.user;
      return globalState;
    default:
      return globalState;
  }
};

export function GlobalStateProvider(props) {
  const [globalState, dispatch] = useReducer(reducer, initialValues);

  return <GlobalStateContext.Provider value={{ globalState, dispatch }}>{props.children}</GlobalStateContext.Provider>;
}
