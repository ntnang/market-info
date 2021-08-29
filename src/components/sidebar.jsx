import React from "react";
import { Link } from "react-router-dom";

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
          <li className="active ">
            <Link to="/dashboard">
              <i className="tim-icons icon-chart-pie-36"></i>
              <p>Dashboard</p>
            </Link>
          </li>
          <li>
            <Link to="/products">
              <i className="tim-icons icon-puzzle-10"></i>
              <p>Products</p>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SideBar;
