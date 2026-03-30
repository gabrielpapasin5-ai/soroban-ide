import { createHashRouter } from "react-router-dom";
import MainComponent from "../components/Main";
import ExplorerRoute from "../components/sidebar-routes/explorer";
import React from "react";

export default createHashRouter([
    {
      path: "/",
      element: <MainComponent />,
      errorElement: <MainComponent />,
      children: [
        {
          path: '/',
          element: <ExplorerRoute />,
          index: true
        },
      ]
    },
]);