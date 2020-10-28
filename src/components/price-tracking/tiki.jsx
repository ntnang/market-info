import React, { Component } from "react";

class Tiki extends Component {
  state = {
    link: "",
    product: {
      id: "",
      name: "",
      price: 0,
      thumbnail_url: "",
      current_seller: {
        id: "",
        store_id: "",
        name: "",
        slug: "",
        sku: "",
        price: "",
        logo: "",
        product_id: "",
      },
      other_sellers: {},
    },
  };
  render() {
    return (
      <div>
        <h3>Tiki</h3>
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
        <div>{this.state.product.id}</div>
        <div>{this.state.product.name}</div>
        <div>{this.state.product.price}</div>
        <img src={this.state.product.thumbnail_url} />
        <div>{this.state.product.current_seller.name}</div>
        <img src={this.state.product.current_seller.logo} />
      </div>
    );
  }
  getProductInformation = () => {
    let start = this.state.link.lastIndexOf("-p") + 2;
    let end = this.state.link.search(".html");
    let productId = this.state.link.substring(start, end);
    fetch("https://tiki.vn//api/v2/products/" + productId)
      .then((response) => response.json())
      .then((product) => {
        this.setState({ product });
      });
  };
  trackProductInformation = () => {};
  onInputValueChanged = (event) => {
    this.setState({ link: event.target.value });
  };
}
export default Tiki;
