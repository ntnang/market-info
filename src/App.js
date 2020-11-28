import React, { Component } from "react";
import "./App.css";
import Tiki from "./components/price-tracking/tiki";
import Shopee from "./components/price-tracking/shopee";
import MainPanel from "./components/main-panel";
import SideBar from "./components/sidebar";
import Setting from "./components/setting";

class App extends Component {
  render() {
    return (
      <React.Fragment>
        {/* <Tiki />
        <Shopee /> */}
        <SideBar />
        <MainPanel />
        <Setting />
      </React.Fragment>
    );
  }
}

export default App;
