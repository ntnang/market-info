import React, { Component } from "react";
import { Card } from "primereact/card";
import { DataView, DataViewLayoutOptions } from "primereact/dataview";
import { ProductService } from "../../service/ProductService";

class Products extends Component {
  state = {
    products: null,
    loading: true,
    layout: "grid",
    first: 0,
    totalRecords: 0,
  };

  rows = 6;
  productService = new ProductService();

  componentDidMount() {
    this.productService.getAllProducts().then((products) => {
      this.setState({
        products: products.slice(0, this.rows),
        loading: false,
        totalRecords: products.length,
      });
    });
  }

  onPage = (event) => {
    this.setState({
      loading: true,
    });

    const startIndex = event.first;
    const endIndex = Math.min(
      event.first + this.rows,
      this.state.totalRecords - 1
    );
    const newProducts =
      startIndex === endIndex
        ? this.datasource.slice(startIndex)
        : this.datasource.slice(startIndex, endIndex);

    this.setState({
      first: startIndex,
      products: newProducts,
      loading: false,
    });
  };

  getListLayout(product) {
    return (
      <div className="p-col-12">
        <div className="product-list-item">
          <img
            src={`${product.imagesUrls[0]}`}
            onError={(e) =>
              (e.target.src =
                "https://www.primefaces.org/wp-content/uploads/2020/05/placeholder.png")
            }
            alt={product.name}
          />
          <div className="product-list-detail">
            <div className="product-name">{product.name}</div>
            <div className="product-description">{product.origin}</div>
          </div>
        </div>
      </div>
    );
  }

  getGridLayout(product) {
    return (
      <div className="p-col-12 p-md-4">
        <div className="product-grid-item card">
          <div className="product-grid-item-content">
            <img
              src={`${product.imagesUrls[0]}`}
              onError={(e) =>
                (e.target.src =
                  "https://www.primefaces.org/wp-content/uploads/2020/05/placeholder.png")
              }
              alt={product.name}
            />
            <div className="product-name">{product.name}</div>
            <div className="product-description">{product.origin}</div>
          </div>
        </div>
      </div>
    );
  }

  getItemTemplate = (product, layout) => {
    if (!product) {
      return;
    }

    if (layout === "list") return this.getListLayout(product);
    else if (layout === "grid") return this.getGridLayout(product);
  };

  getHeader() {
    let onOptionChange = (e) => {
      this.setState({ loading: true }, () => {
        this.setState({
          loading: false,
          layout: e.value,
        });
      });
    };

    return (
      <div style={{ textAlign: "left" }}>
        <DataViewLayoutOptions
          layout={this.state.layout}
          onChange={onOptionChange}
        />
      </div>
    );
  }

  render() {
    const header = this.getHeader();
    return (
      <React.Fragment>
        <div className="row">
          <div className="col-12">
            <Card className="card">
              <DataView
                value={this.state.products}
                layout={this.state.layout}
                header={header}
                itemTemplate={this.getItemTemplate}
                onPage={this.onPage}
                lazy
                paginator
                paginatorPosition={"both"}
                loading={this.state.loading}
                totalRecords={this.state.totalRecords}
                rows={this.rows}
                first={this.state.first}
              />
            </Card>
          </div>
        </div>
      </React.Fragment>
    );
  }
}
export default Products;
