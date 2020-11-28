import React from "react";
import NavBar from "./navbar";
import Content from "./content";
import Footer from "./footer";

const MainPanel = () => {
  return (
    <div class="main-panel">
      <NavBar />
      <Content />
      <Footer />
    </div>
  );
};

export default MainPanel;
