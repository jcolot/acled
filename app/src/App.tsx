import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalStateProvider } from "./contexts/GlobalStateContext";
import { routes } from "./routes";
import "./App.css";

export const queryClient = new QueryClient();
queryClient.setDefaultOptions({
  ...queryClient.getDefaultOptions(),
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});

const router = createBrowserRouter(routes);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalStateProvider>
      <RouterProvider router={router} />
    </GlobalStateProvider>
  </QueryClientProvider>
);

export default App;
