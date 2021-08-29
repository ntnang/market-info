import React, { Component } from "react";
import { Route } from "react-router-dom";
import Dashboard from "./content/dashboard";
import Products from "./content/products";

class Content extends Component {
  render() {
    return (
      <div className="content">
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/products" component={Products} />
      </div>
    );
  }
}

export default Content;
