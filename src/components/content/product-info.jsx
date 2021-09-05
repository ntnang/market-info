import React, { Component } from "react";
import { Button } from "primereact/button";
import { Carousel } from "primereact/carousel";
import { Dialog } from "primereact/dialog";
import { ProductService } from "../../service/ProductService";
import { UrlExtractor } from "../../service/UrlExtractor";
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

  productService = new ProductService();
  urlExtractor = new UrlExtractor();

  getFooter() {
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
        footer={this.getFooter()}
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
    const hostname = this.urlExtractor.extractHostname(this.props.link);
    switch (hostname) {
      case this.urlExtractor.TIKI_VN:
        const productId = this.urlExtractor.extractTikiProductId(
          this.props.link
        );
        this.productService
          .getProductInformation(hostname, productId)
          .then((product) => {
            this.setState({
              product,
            });
          });
        break;
      case this.urlExtractor.SHOPEE_VN:
        const ids = this.urlExtractor.extractShopeeProductIds();
        this.productService
          .getProductInformation(hostname, ids.itemId, ids.shopId)
          .then((product) => {
            this.setState({
              product,
            });
          });
        break;
      default:
        alert("Not supported!");
        break;
    }
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
