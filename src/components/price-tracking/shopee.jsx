import React, { Component } from "react";

class Shopee extends Component {
  state = {
    link: "",
    item: {
      itemid: 0,
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
        <div>{this.state.item.itemid}</div>
        <div>{this.state.item.name}</div>
        <div>{this.state.item.price_max}</div>
      </div>
    );
  }
  getProductInformation = () => {
    const proxy = "https://cors-anywhere.herokuapp.com/"; // use this proxy api to bypass the cors (cross-origin resource sharing) problem, see more https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSAllowOriginNotMatchingOrigin
    const start = this.state.link.lastIndexOf("-i") + 2;
    const end = this.state.link.length;
    const idStr = this.state.link.substring(start, end);
    const ids = idStr.split(".");
    const itemId = ids[2];
    const shopId = ids[1];
    fetch(
      proxy +
        "https://shopee.vn/api/v2/item/get?itemid=" +
        itemId +
        "&shopid=" +
        shopId,
      {
        cache: "no-store",
      }
    )
      .then((response) => response.json())
      .then((data) => {
        this.setState({ item: data.item });
      });
  };
  onInputValueChanged = (event) => {
    this.setState({ link: event.target.value });
  };
}
export default Shopee;
