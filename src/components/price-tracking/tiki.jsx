import React, { Component } from "react";

class Tiki extends Component {
  state = {
    link: "",
    product: {
      id: 0,
      name: "",
      price: 0,
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
        <div>{this.state.product.id}</div>
        <div>{this.state.product.name}</div>
        <div>{this.state.product.price}</div>
      </div>
    );
  }
  getProductInformation = () => {
    if (this.state.link.search("tiki")) {
      let start = this.state.link.lastIndexOf("-p") + 2;
      let end = this.state.link.search(".html");
      let productId = this.state.link.substring(start, end);
      fetch("https://tiki.vn//api/v2/products/" + productId)
        .then((response) => response.json())
        .then((product) => {
          this.setState({ product });
        });
    } else if (this.state.link.search("shopee")) {
      let start = this.state.link.lastIndexOf("-i") + 2;
      let end = this.state.link.length;
      let idStr = this.state.link.substring(start, end);
      let ids = idStr.split(".");
      let itemId = ids[0];
      let shopId = ids[1];
      fetch(
        "https://shopee.vn/api/v2/item/get?itemid=" +
          itemId +
          "&shopid=" +
          shopId
      )
        .then((response) => response.json())
        .then((product) => {
          this.setState({ product });
        });
    }
  };
  onInputValueChanged = (event) => {
    this.setState({ link: event.target.value });
  };
}
export default Tiki;
