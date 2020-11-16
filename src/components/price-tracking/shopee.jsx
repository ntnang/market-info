import React, { Component } from "react";

class Shopee extends Component {
  state = {
    link: "",
    item: {
      itemid: "",
      shopid: "",
      name: "",
      price_max: 0,
    },
  };
  render() {
    return (
      <div>
        <h3>Shopee</h3>
        <input value={this.state.link} onChange={this.onInputValueChanged} />
        <button
          onClick={() => this.getProductInformation()}
          className="btn btn-secondary btn-sm"
        >
          Get
        </button>
        <button
          onClick={() => this.trackProductInformation()}
          className="btn btn-secondary btn-sm"
        >
          Track
        </button>
        <div>{this.state.item.itemid}</div>
        <div>{this.state.item.name}</div>
        <div>{this.state.item.price_max}</div>
      </div>
    );
  }
  getProductInformation = () => {
    // use the proxy https://cors-anywhere.herokuapp.com/ to bypass cors from client side
    const start = this.state.link.lastIndexOf("-i") + 2;
    const end = this.state.link.length;
    const idStr = this.state.link.substring(start, end);
    const ids = idStr.split(".");
    const itemId = ids[2];
    const shopId = ids[1];
    const endPoint = `http://localhost:3001/api/shopee/get/${itemId}/${shopId}`;
    fetch(endPoint)
      .then((response) => response.json())
      .then((data) => {
        this.setState({ item: data.item });
      });
  };

  trackProductInformation = () => {
    const start = this.state.link.lastIndexOf("-i") + 2;
    const end = this.state.link.length;
    const idStr = this.state.link.substring(start, end);
    const ids = idStr.split(".");
    const itemId = ids[2];
    const shopId = ids[1];
    const localEndPoint = `http://localhost:3001/api/shopee/track/${itemId}/${shopId}`;
    fetch(localEndPoint)
      .then((response) => response.json())
      .then((data) => {
        this.setState({ item: data });
      });
  };

  onInputValueChanged = (event) => {
    this.setState({ link: event.target.value });
  };
}
export default Shopee;
