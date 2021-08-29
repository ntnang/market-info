import React, { Component } from "react";
import { Button } from "primereact/button";
import { Carousel } from "primereact/carousel";
import { Dialog } from "primereact/dialog";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

class ProductInfo extends Component {
  state = {
    product: {
      name: "",
      imagesUrls: [],
      origin: "",
      sellers: [],
      lastTrackedDate: null,
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

  getImageTemplateForCarousel = (imgUrl) => {
    return <img src={imgUrl} />;
  };

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
        <Carousel
          value={this.state.product.imagesUrls}
          itemTemplate={this.getImageTemplateForCarousel}
        />
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
    fetch(`http://localhost:3001/api/tiki/product/history/${productId}`)
      .then((res) => res.json())
      .then((product) => {
        if (Array.isArray(product.sellers)) {
          product.sellers = new Map(product.sellers);
        }
        this.setState({ product });
      });
  };

  getShopeeProductInformation = () => {
    // use the proxy https://cors-anywhere.herokuapp.com/ to bypass cors from client side
    const ids = this.extractShopeeProductIds();
    const endPoint = `http://localhost:3001/api/shopee/product/history/${ids.itemId}/${ids.shopId}`;
    fetch(endPoint)
      .then((res) => res.json())
      .then((product) => {
        if (Array.isArray(product.sellers)) {
          product.sellers = new Map(product.sellers);
        }
        this.setState({ product });
      });
  };

  trackProductInformation = () => {
    const productId = this.extractTikiProductId();
    fetch(`http://localhost:3001/api/product/${productId}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.state.product, this.replacer),
    });
    this.props.onHide();
  };

  extractTikiProductId() {
    const start = this.props.link.lastIndexOf("-p") + 2;
    const end = this.props.link.search(".html");
    const productId = this.props.link.substring(start, end);
    return productId;
  }

  extractShopeeProductIds() {
    const start = this.props.link.lastIndexOf("-i") + 2;
    const end = this.props.link.length;
    const idStr = this.props.link.substring(start, end);
    const ids = idStr.split(".");
    return { itemId: ids[2], shopId: ids[1] };
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

  replacer(key, value) {
    if (value instanceof Map) {
      return {
        dataType: "Map",
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else {
      return value;
    }
  }
}
export default ProductInfo;
