import React, { Component } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";

class Content extends Component {
  state = {
    productHistory: {
      datasets: [],
    },
  };

  lastSevenDates = [...Array(7)]
    .map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    })
    .reverse();

  weekDayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  componentDidMount() {
    this.findLastTrackedProductHistories();
  }

  findLastTrackedProductHistories() {
    const lastSevenWeekDayNames = this.lastSevenDates.map(
      (date) => this.weekDayNames[date.getDay()]
    );
    fetch("http://localhost:3001/api/tiki/last/history")
      .then((res) => res.json())
      .then((history) => {
        this.setState({
          productHistory: {
            labels: lastSevenWeekDayNames,
            datasets: this.buildChartDataSet(history),
          },
        });
      });
  }

  buildChartDataSet(productHistory) {
    const datasets = [];
    const sellerHistoryMap = new Map(Object.entries(productHistory.sellers));
    for (let sellerHistory of sellerHistoryMap.values()) {
      const lastSevenDaysDataSet = this.buildLastSevenDaysDataSet(
        sellerHistory
      );
      if (lastSevenDaysDataSet.data.some((data) => data != null)) {
        datasets.push(lastSevenDaysDataSet);
      }
    }
    return datasets;
  }

  buildLastSevenDaysDataSet(sellerHistory) {
    const dataset = {};
    const lastSevenDaysHistories = sellerHistory.priceHistories.filter(
      (history) => Date.parse(history.trackedDate) > this.getDateThreshold(7)
    );

    dataset.data = this.generateChartData(
      sellerHistory.priceHistories,
      lastSevenDaysHistories,
      this.lastSevenDates
    );
    dataset.label = sellerHistory.name;
    return dataset;
  }

  getDateThreshold(numberOfDays) {
    let dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - numberOfDays);
    return dateThreshold;
  }

  generateChartData(wholeHistories, inChartRangeHistories, chartDates) {
    const filledHistories = [];
    let previousHistory = this.getBoundaryStartValue(
      wholeHistories,
      inChartRangeHistories
    );
    chartDates.forEach((date) => {
      const historiesOnCurrentDate = inChartRangeHistories.filter((history) => {
        const trackedDate = new Date(history.trackedDate);
        return (
          trackedDate.getDate() === date.getDate() &&
          trackedDate.getMonth() === date.getMonth() &&
          trackedDate.getFullYear() === date.getFullYear()
        );
      });
      if (historiesOnCurrentDate.length != 0) {
        previousHistory =
          historiesOnCurrentDate[historiesOnCurrentDate.length - 1];
      }
      filledHistories.push(previousHistory);
    });
    return filledHistories.map((history) => (history ? history.price : null));
  }

  getBoundaryStartValue(wholeHistories, inChartRangeHistories) {
    const outChartRangeHistories = wholeHistories.filter(
      (history) => !inChartRangeHistories.includes(history)
    );
    return outChartRangeHistories[outChartRangeHistories.length - 1];
  }

  basicOptions = {
    legend: {
      labels: {
        fontColor: "#495057",
      },
    },
    scales: {
      xAxes: [
        {
          ticks: {
            fontColor: "#495057",
          },
        },
      ],
      yAxes: [
        {
          ticks: {
            fontColor: "#495057",
          },
        },
      ],
    },
  };

  render() {
    return (
      <div className="content">
        <div className="row">
          <div className="col-12">
            <Card className="card card-chart">
              <Chart
                type="line"
                data={this.state.productHistory}
                options={this.basicOptions}
              />
            </Card>
            {/* <div className="card card-chart">
              <div className="card-header ">
                <div className="row">
                  <div className="col-sm-6 text-left">
                    <h5 className="card-category">Total Shipments</h5>
                    <h2 className="card-title">Performance</h2>
                  </div>
                  <div className="col-sm-6">
                    <div
                      className="btn-group btn-group-toggle float-right"
                      data-toggle="buttons"
                    >
                      <label
                        className="btn btn-sm btn-primary btn-simple active"
                        id="0"
                      >
                        <input type="radio" name="options" />
                        <span className="d-none d-sm-block d-md-block d-lg-block d-xl-block">
                          Accounts
                        </span>
                        <span className="d-block d-sm-none">
                          <i className="tim-icons icon-single-02"></i>
                        </span>
                      </label>
                      <label
                        className="btn btn-sm btn-primary btn-simple"
                        id="1"
                      >
                        <input
                          type="radio"
                          className="d-none d-sm-none"
                          name="options"
                        />
                        <span className="d-none d-sm-block d-md-block d-lg-block d-xl-block">
                          Purchases
                        </span>
                        <span className="d-block d-sm-none">
                          <i className="tim-icons icon-gift-2"></i>
                        </span>
                      </label>
                      <label
                        className="btn btn-sm btn-primary btn-simple"
                        id="2"
                      >
                        <input type="radio" className="d-none" name="options" />
                        <span className="d-none d-sm-block d-md-block d-lg-block d-xl-block">
                          Sessions
                        </span>
                        <span className="d-block d-sm-none">
                          <i className="tim-icons icon-tap-02"></i>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="chart-area">
                  <canvas id="chartBig1"></canvas>
                </div>
              </div>
            </div> */}
          </div>
        </div>
        <div className="row">
          <div className="col-lg-4">
            <div className="card card-chart">
              <div className="card-header">
                <h5 className="card-category">Total Shipments</h5>
                <h3 className="card-title">
                  <i className="tim-icons icon-bell-55 text-primary"></i>{" "}
                  763,215
                </h3>
              </div>
              <div className="card-body">
                <div className="chart-area">
                  <canvas id="chartLinePurple"></canvas>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card card-chart">
              <div className="card-header">
                <h5 className="card-category">Daily Sales</h5>
                <h3 className="card-title">
                  <i className="tim-icons icon-delivery-fast text-info"></i>{" "}
                  3,500€
                </h3>
              </div>
              <div className="card-body">
                <div className="chart-area">
                  <canvas id="CountryChart"></canvas>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card card-chart">
              <div className="card-header">
                <h5 className="card-category">Completed Tasks</h5>
                <h3 className="card-title">
                  <i className="tim-icons icon-send text-success"></i> 12,100K
                </h3>
              </div>
              <div className="card-body">
                <div className="chart-area">
                  <canvas id="chartLineGreen"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-6 col-md-12">
            <div className="card card-tasks">
              <div className="card-header ">
                <h6 className="title d-inline">Tasks(5)</h6>
                <p className="card-category d-inline">today</p>
                <div className="dropdown">
                  <button
                    type="button"
                    className="btn btn-link dropdown-toggle btn-icon"
                    data-toggle="dropdown"
                  >
                    <i className="tim-icons icon-settings-gear-63"></i>
                  </button>
                  <div
                    className="dropdown-menu dropdown-menu-right"
                    aria-labelledby="dropdownMenuLink"
                  >
                    <a className="dropdown-item" href="#pablo">
                      Action
                    </a>
                    <a className="dropdown-item" href="#pablo">
                      Another action
                    </a>
                    <a className="dropdown-item" href="#pablo">
                      Something else
                    </a>
                  </div>
                </div>
              </div>
              <div className="card-body ">
                <div className="table-full-width table-responsive">
                  <table className="table">
                    <tbody>
                      <tr>
                        <td>
                          <div className="form-check">
                            <label className="form-check-label">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                value=""
                              />
                              <span className="form-check-sign">
                                <span className="check"></span>
                              </span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <p className="title">Update the Documentation</p>
                          <p className="text-muted">
                            Dwuamish Head, Seattle, WA 8:47 AM
                          </p>
                        </td>
                        <td className="td-actions text-right">
                          <button
                            type="button"
                            rel="tooltip"
                            title=""
                            className="btn btn-link"
                            data-original-title="Edit Task"
                          >
                            <i className="tim-icons icon-pencil"></i>
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check">
                            <label className="form-check-label">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                value=""
                              />
                              <span className="form-check-sign">
                                <span className="check"></span>
                              </span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <p className="title">GDPR Compliance</p>
                          <p className="text-muted">
                            The GDPR is a regulation that requires businesses to
                            protect the personal data and privacy of Europe
                            citizens for transactions that occur within EU
                            member states.
                          </p>
                        </td>
                        <td className="td-actions text-right">
                          <button
                            type="button"
                            rel="tooltip"
                            title=""
                            className="btn btn-link"
                            data-original-title="Edit Task"
                          >
                            <i className="tim-icons icon-pencil"></i>
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check">
                            <label className="form-check-label">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                value=""
                              />
                              <span className="form-check-sign">
                                <span className="check"></span>
                              </span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <p className="title">Solve the issues</p>
                          <p className="text-muted">
                            Fifty percent of all respondents said they would be
                            more likely to shop at a company{" "}
                          </p>
                        </td>
                        <td className="td-actions text-right">
                          <button
                            type="button"
                            rel="tooltip"
                            title=""
                            className="btn btn-link"
                            data-original-title="Edit Task"
                          >
                            <i className="tim-icons icon-pencil"></i>
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check">
                            <label className="form-check-label">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                value=""
                              />
                              <span className="form-check-sign">
                                <span className="check"></span>
                              </span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <p className="title">Release v2.0.0</p>
                          <p className="text-muted">
                            Ra Ave SW, Seattle, WA 98116, SUA 11:19 AM
                          </p>
                        </td>
                        <td className="td-actions text-right">
                          <button
                            type="button"
                            rel="tooltip"
                            title=""
                            className="btn btn-link"
                            data-original-title="Edit Task"
                          >
                            <i className="tim-icons icon-pencil"></i>
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check">
                            <label className="form-check-label">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                value=""
                              />
                              <span className="form-check-sign">
                                <span className="check"></span>
                              </span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <p className="title">Export the processed files</p>
                          <p className="text-muted">
                            The report also shows that consumers will not easily
                            forgive a company once a breach exposing their
                            personal data occurs.{" "}
                          </p>
                        </td>
                        <td className="td-actions text-right">
                          <button
                            type="button"
                            rel="tooltip"
                            title=""
                            className="btn btn-link"
                            data-original-title="Edit Task"
                          >
                            <i className="tim-icons icon-pencil"></i>
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="form-check">
                            <label className="form-check-label">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                value=""
                              />
                              <span className="form-check-sign">
                                <span className="check"></span>
                              </span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <p className="title">Arival at export process</p>
                          <p className="text-muted">
                            Capitol Hill, Seattle, WA 12:34 AM
                          </p>
                        </td>
                        <td className="td-actions text-right">
                          <button
                            type="button"
                            rel="tooltip"
                            title=""
                            className="btn btn-link"
                            data-original-title="Edit Task"
                          >
                            <i className="tim-icons icon-pencil"></i>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-6 col-md-12">
            <div className="card ">
              <div className="card-header">
                <h4 className="card-title"> Simple Table</h4>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table tablesorter " id="">
                    <thead className=" text-primary">
                      <tr>
                        <th>Name</th>
                        <th>Country</th>
                        <th>City</th>
                        <th className="text-center">Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Dakota Rice</td>
                        <td>Niger</td>
                        <td>Oud-Turnhout</td>
                        <td className="text-center">$36,738</td>
                      </tr>
                      <tr>
                        <td>Minerva Hooper</td>
                        <td>Curaçao</td>
                        <td>Sinaai-Waas</td>
                        <td className="text-center">$23,789</td>
                      </tr>
                      <tr>
                        <td>Sage Rodriguez</td>
                        <td>Netherlands</td>
                        <td>Baileux</td>
                        <td className="text-center">$56,142</td>
                      </tr>
                      <tr>
                        <td>Philip Chaney</td>
                        <td>Korea, South</td>
                        <td>Overland Park</td>
                        <td className="text-center">$38,735</td>
                      </tr>
                      <tr>
                        <td>Doris Greene</td>
                        <td>Malawi</td>
                        <td>Feldkirchen in Kärnten</td>
                        <td className="text-center">$63,542</td>
                      </tr>
                      <tr>
                        <td>Mason Porter</td>
                        <td>Chile</td>
                        <td>Gloucester</td>
                        <td className="text-center">$78,615</td>
                      </tr>
                      <tr>
                        <td>Jon Porter</td>
                        <td>Portugal</td>
                        <td>Gloucester</td>
                        <td className="text-center">$98,615</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Content;
