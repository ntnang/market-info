import React, { Component } from "react";
import Tiki from "./price-tracking/tiki";
import Shopee from "./price-tracking/shopee";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

class NavBar extends Component {
  state = {
    link: "",
    isTikiDialogVisible: false,
    isShopeeDialogVisible: false,
  };

  render() {
    return (
      <React.Fragment>
        <nav className="navbar navbar-expand-lg navbar-absolute navbar-transparent">
          <div className="container-fluid">
            <div className="navbar-wrapper">
              <div className="navbar-toggle d-inline">
                <button type="button" className="navbar-toggler">
                  <span className="navbar-toggler-bar bar1"></span>
                  <span className="navbar-toggler-bar bar2"></span>
                  <span className="navbar-toggler-bar bar3"></span>
                </button>
              </div>
              <a className="navbar-brand" href="#">
                Dashboard
              </a>
            </div>
            <button
              className="navbar-toggler"
              type="button"
              data-toggle="collapse"
              data-target="#navigation"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-bar navbar-kebab"></span>
              <span className="navbar-toggler-bar navbar-kebab"></span>
              <span className="navbar-toggler-bar navbar-kebab"></span>
            </button>
            <div className="collapse navbar-collapse" id="navigation">
              <ul className="navbar-nav ml-auto">
                <li className="search-bar input-group">
                  {/* <button
                    className="btn btn-link"
                    id="search-button"
                    data-toggle="modal"
                    data-target="#searchModal"
                  >
                    <i className="tim-icons icon-zoom-split"></i>
                    <span className="d-lg-none d-md-block">Search</span>
                  </button> */}
                  <Button
                    id="search-button"
                    icon="tim-icons icon-zoom-split"
                    className="p-button-secondary p-button-text"
                    onClick={(e) => this.op.toggle(e)}
                  />
                </li>
                <li className="dropdown nav-item">
                  <a
                    href="#"
                    className="dropdown-toggle nav-link"
                    data-toggle="dropdown"
                  >
                    <div className="notification d-none d-lg-block d-xl-block"></div>
                    <i className="tim-icons icon-sound-wave"></i>
                    <p className="d-lg-none">Notifications</p>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-right dropdown-navbar">
                    <li className="nav-link">
                      <a href="#" className="nav-item dropdown-item">
                        Mike John responded to your email
                      </a>
                    </li>
                    <li className="nav-link">
                      <a href="#" className="nav-item dropdown-item">
                        You have 5 more tasks
                      </a>
                    </li>
                    <li className="nav-link">
                      <a href="#" className="nav-item dropdown-item">
                        Your friend Michael is in town
                      </a>
                    </li>
                    <li className="nav-link">
                      <a href="#" className="nav-item dropdown-item">
                        Another notification
                      </a>
                    </li>
                    <li className="nav-link">
                      <a href="#" className="nav-item dropdown-item">
                        Another one
                      </a>
                    </li>
                  </ul>
                </li>
                <li className="dropdown nav-item">
                  <a
                    href="#"
                    className="dropdown-toggle nav-link"
                    data-toggle="dropdown"
                  >
                    <div className="photo">
                      <img src="../assets/img/anime3.png" alt="Profile Photo" />
                    </div>
                    <b className="caret d-none d-lg-block d-xl-block"></b>
                    <p className="d-lg-none">Log out</p>
                  </a>
                  <ul className="dropdown-menu dropdown-navbar">
                    <li className="nav-link">
                      <a href="#" className="nav-item dropdown-item">
                        Profile
                      </a>
                    </li>
                    <li className="nav-link">
                      <a href="#" className="nav-item dropdown-item">
                        Settings
                      </a>
                    </li>
                    <li className="dropdown-divider"></li>
                    <li className="nav-link">
                      <a href="#" className="nav-item dropdown-item">
                        Log out
                      </a>
                    </li>
                  </ul>
                </li>
                <li className="separator d-lg-none"></li>
              </ul>
            </div>
          </div>
        </nav>

        <OverlayPanel ref={(el) => (this.op = el)} showCloseIcon dismissable>
          <InputText
            value={this.state.link}
            placeholder="Search Tiki/Shopee"
            onChange={this.onInputValueChanged}
            onKeyDown={this.onSearchKeyDown}
          />
        </OverlayPanel>
        {/* <div
          className="modal modal-search fade"
          id="searchModal"
          tabIndex="-1"
          role="dialog"
          aria-labelledby="searchModal"
          aria-hidden="true"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <input
                  type="text"
                  className="form-control"
                  id="inlineFormInputGroup"
                  placeholder="SEARCH"
                  value={this.state.link}
                  onChange={this.onInputValueChanged}
                  onKeyDown={this.onSearchKeyDown}
                />
                <button
                  type="button"
                  className="close"
                  data-dismiss="modal"
                  aria-label="Close"
                >
                  <i className="tim-icons icon-simple-remove"></i>
                </button>
              </div>
            </div>
          </div>
        </div> */}
        <Tiki
          link={this.state.link}
          isDialogVisible={this.state.isTikiDialogVisible}
          onHide={this.hideTikiDialog}
        />
        <Shopee
          link={this.state.link}
          isDialogVisible={this.state.isShopeeDialogVisible}
          onHide={this.hideShopeeDialog}
        />
      </React.Fragment>
    );
  }

  onInputValueChanged = (event) => {
    this.setState({ link: event.target.value });
  };

  onSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      this.showProductInformation();
    }
  };

  showTikiDialog = () => {
    this.setState({ isTikiDialogVisible: true });
  };

  hideTikiDialog = () => {
    this.setState({ isTikiDialogVisible: false });
  };

  showShopeeDialog = () => {
    this.setState({ isShopeeDialogVisible: true });
  };

  hideShopeeDialog = () => {
    this.setState({ isShopeeDialogVisible: false });
  };

  showProductInformation() {
    switch (this.extractHostname(this.state.link)) {
      case "tiki.vn":
        this.showTikiDialog();
        break;
      case "shopee.vn":
        this.showShopeeDialog();
        break;
    }
  }

  extractHostname(url) {
    var hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("//") > -1) {
      hostname = url.split("/")[2];
    } else {
      hostname = url.split("/")[0];
    }

    //find & remove port number
    hostname = hostname.split(":")[0];
    //find & remove "?"
    hostname = hostname.split("?")[0];

    return hostname;
  }
}

export default NavBar;
