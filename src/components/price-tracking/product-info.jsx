import React, { Component } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

class ProductInfo extends Component {
  state = {
    product: {
      id: "",
      name: "",
      price: 0,
      thumbnailUrl: "",
      origin: "",
      sellers: {
        id: "",
        store_id: "",
        name: "",
        slug: "",
        sku: "",
        price: "",
        logo: "",
        product_id: "",
      },
    },
  };

  renderFooter() {
    return (
      <div>
        <Button
          label="Cancel"
          icon="pi pi-times"
          onClick={this.props.onHide}
          className="p-button-text"
        />
        <Button
          label="Track"
          icon="pi pi-check"
          className="btn-primary"
          onClick={this.trackProductInformation}
          autoFocus
        />
      </div>
    );
  }

  render() {
    return (
      <Dialog
        header="Product information"
        footer={this.renderFooter()}
        visible={this.props.isDialogVisible}
        style={{ width: "50vw" }}
        onHide={this.props.onHide}
        onShow={this.getProductInformation}
        modal
      >
        <div>{this.state.product.name}</div>
        <div>{this.state.product.price}</div>
      </Dialog>
    );
  }

  getProductInformation = () => {
    switch (this.extractHostname(this.props.link)) {
      case "tiki.vn":
        this.getTikiProductInformation();
        break;
      case "shopee.vn":
        this.getShopeeProductInformation();
        break;
    }
  };

  getTikiProductInformation = () => {
    const productId = this.extractTikiProductId();
    fetch(`https://tiki.vn/api/v2/products/${productId}`)
      .then((res) => res.json())
      .then((product) => {
        this.setState({ product });
      });
  };

  getShopeeProductInformation = () => {
    // use the proxy https://cors-anywhere.herokuapp.com/ to bypass cors from client side
    const start = this.props.link.lastIndexOf("-i") + 2;
    const end = this.props.link.length;
    const idStr = this.props.link.substring(start, end);
    const ids = idStr.split(".");
    const itemId = ids[2];
    const shopId = ids[1];
    const endPoint = `http://localhost:3001/api/shopee/get/${itemId}/${shopId}`;
    fetch(endPoint)
      .then((res) => res.json())
      .then((data) => {
        this.setState({ item: data.item });
      });
  };

  trackProductInformation = () => {
    const productId = this.extractTikiProductId();
    fetch(`http://localhost:3001/api/tiki/${productId}`)
      .then((res) => res.json())
      .then((product) => {
        this.setState({ product });
      });
    this.props.onHide();
  };

  extractTikiProductId() {
    const start = this.props.link.lastIndexOf("-p") + 2;
    const end = this.props.link.search(".html");
    const productId = this.props.link.substring(start, end);
    return productId;
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
export default ProductInfo;
