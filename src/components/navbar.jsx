import React, { Component } from "react";
import ProductInfo from "./content/product-info";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

class NavBar extends Component {
  state = {
    link: "",
    isProductInfoDialogVisible: false,
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
                  <InputText
                    value={this.state.link}
                    placeholder="Paste Tiki/Shopee link here..."
                    className="form-control"
                    onChange={this.onInputValueChanged}
                    onKeyDown={this.onSearchKeyDown}
                  />
                  <Button
                    id="search-button"
                    icon="tim-icons icon-zoom-split"
                    className="p-button-secondary p-button-text"
                    onClick={this.showProductInfoDialog}
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
        <ProductInfo
          link={this.state.link}
          isDialogVisible={this.state.isProductInfoDialogVisible}
          onHide={this.hideProductInfoDialog}
        />
      </React.Fragment>
    );
  }

  onInputValueChanged = (event) => {
    this.setState({ link: event.target.value });
  };

  onSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      this.showProductInfoDialog();
    }
  };

  showProductInfoDialog = () => {
    this.setState({ isProductInfoDialogVisible: true });
  };

  hideProductInfoDialog = () => {
    this.setState({ isProductInfoDialogVisible: false });
  };
}

export default NavBar;
