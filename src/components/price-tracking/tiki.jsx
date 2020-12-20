import React, { Component } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

class Tiki extends Component {
  state = {
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
    },
  };

  renderFooter() {
    return (
      <div>
        <Button
          label="Cancel"
          icon="pi pi-times"
          onClick={this.hideDialog}
          className="p-button-text"
        />
        <Button
          label="Track"
          icon="pi pi-check"
          onClick={this.hideDialog}
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
    const start = this.props.link.lastIndexOf("-p") + 2;
    const end = this.props.link.search(".html");
    const productId = this.props.link.substring(start, end);
    fetch(`https://tiki.vn/api/v2/products/${productId}`)
      .then((response) => response.json())
      .then((product) => {
        this.setState({ product });
      });
  };

  trackProductInformation = () => {
    const start = this.props.link.lastIndexOf("-p") + 2;
    const end = this.props.link.search(".html");
    const productId = this.props.link.substring(start, end);
    fetch(`http://localhost:3001/api/tiki/${productId}`)
      .then((response) => response.json())
      .then((product) => {
        this.setState({ product });
      });
  };
}
export default Tiki;
