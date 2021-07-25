import React, { Component } from "react";
import "./App.css";
import MainPanel from "./components/main-panel";
import SideBar from "./components/sidebar";
import Setting from "./components/setting";
import "./scss/button.scss";
import "./scss/card.scss";

class App extends Component {
  render() {
    return (
      <React.Fragment>
        <SideBar />
        <MainPanel />
        <Setting />
      </React.Fragment>
    );
  }
}

export default App;
