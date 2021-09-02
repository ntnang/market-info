import React from "react";
import { NavLink } from "react-router-dom";

const SideBar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-wrapper">
        <div className="logo">
          <a href="#" className="simple-text logo-mini">
            MI
          </a>
          <a href="#" className="simple-text logo-normal">
            Market info
          </a>
        </div>
        <ul className="nav">
          <li>
            <NavLink to="/dashboard" activeClassName="active">
              <i className="tim-icons icon-chart-pie-36"></i>
              <p>Dashboard</p>
            </NavLink>
          </li>
          <li>
            <NavLink to="/products" activeClassName="active">
              <i className="tim-icons icon-puzzle-10"></i>
              <p>Products</p>
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SideBar;
