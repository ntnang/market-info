import React, { Component } from "react";
import "./App.css";
import Tiki from "./components/price-tracking/tiki";
import Shopee from "./components/price-tracking/shopee";

class App extends Component {
  render() {
    return (
      <React.Fragment>
        <Tiki />
        <Shopee />
      </React.Fragment>
    );
  }
}

export default App;
