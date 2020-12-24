import React, { Component } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

class Shopee extends Component {
  state = {
    item: {
      itemid: "",
      shopid: "",
      name: "",
      price_max: 0,
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
        <div>{this.state.item.name}</div>
        <div>{this.state.item.price_max}</div>
      </Dialog>
    );
  }
  getProductInformation = () => {
    // use the proxy https://cors-anywhere.herokuapp.com/ to bypass cors from client side
    const start = this.props.link.lastIndexOf("-i") + 2;
    const end = this.props.link.length;
    const idStr = this.props.link.substring(start, end);
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
    const start = this.props.link.lastIndexOf("-i") + 2;
    const end = this.props.link.length;
    const idStr = this.props.link.substring(start, end);
    const ids = idStr.split(".");
    const itemId = ids[2];
    const shopId = ids[1];
    const endPoint = `http://localhost:3001/api/shopee/track/${itemId}/${shopId}`;
    fetch(endPoint)
      .then((response) => response.json())
      .then((data) => {
        this.setState({ item: data });
      });
  };
}
export default Shopee;
