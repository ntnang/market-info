import React, { Component } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import MainPanel from "./components/main-panel";
import SideBar from "./components/sidebar";
import Setting from "./components/setting";
import "./App.css";
import "./scss/button.scss";
import "./scss/card.scss";
import './scss/sidebar.scss'

class App extends Component {
  render() {
    return (
      <React.Fragment>
        <Router>
          <SideBar />
          <MainPanel />
          <Setting />
        </Router>
      </React.Fragment>
    );
  }
}

export default App;
