import React, { Component } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";

class Dashboard extends Component {
  state = {
    product: {
      name: "",
      history: {
        labels: [],
        datasets: [],
      },
    },
  };

  lastSevenDates = [...Array(7)]
    .map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    })
    .reverse();

  weekDayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  componentDidMount() {
    this.findLastTrackedProductHistories();
  }

  findLastTrackedProductHistories() {
    const lastSevenWeekDayNames = this.lastSevenDates.map(
      (date) => this.weekDayNames[date.getDay()]
    );
    fetch("http://localhost:3001/api/last-product/history")
      .then((res) => res.json())
      .then((history) => {
        this.setState({
          product: {
            name: history.name,
            history: {
              labels: lastSevenWeekDayNames,
              datasets: this.buildChartDataSet(history),
            },
          },
        });
      });
  }

  buildChartDataSet(productHistory) {
    console.log(productHistory);
    const datasets = [];
    const sellerHistoryMap = new Map(Object.entries(productHistory.sellers));
    for (let sellerHistory of sellerHistoryMap.values()) {
      const lastSevenDaysDataSet =
        this.buildLastSevenDaysDataSet(sellerHistory);
      if (
        lastSevenDaysDataSet.data &&
        lastSevenDaysDataSet.data.some((data) => data !== null)
      ) {
        datasets.push(lastSevenDaysDataSet);
      }
    }
    return datasets;
  }

  buildLastSevenDaysDataSet(sellerHistory) {
    const dataset = {};
    const lastSevenDaysHistories = sellerHistory.priceHistories.filter(
      (history) =>
        Date.parse(history.trackedDate) > this.getDateOfSevenDaysAgo()
    );
    dataset.data = this.generateChartData(
      sellerHistory.priceHistories,
      lastSevenDaysHistories,
      this.lastSevenDates
    );
    dataset.label = sellerHistory.name;
    dataset.borderColor = "#e14eca";
    return dataset;
  }

  getDateOfSevenDaysAgo() {
    return this.lastSevenDates[0];
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

  gradientChartOptionsConfigurationWithTooltipPurple = {
    maintainAspectRatio: false,
    tooltips: {
      backgroundColor: "#f5f5f5",
      titleFontColor: "#333",
      bodyFontColor: "#666",
      bodySpacing: 4,
      xPadding: 12,
    },
    responsive: true,
    scales: {
      yAxes: [
        {
          gridLines: {
            drawBorder: false,
            color: "rgba(29,140,248,0.0)",
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 20,
            fontColor: "#9a9a9a",
          },
        },
      ],

      xAxes: [
        {
          gridLines: {
            drawBorder: false,
            color: "rgba(225,78,202,0.1)",
            zeroLineColor: "rgba(225,78,202,0.1)",
          },
          ticks: {
            padding: 20,
            fontColor: "#9a9a9a",
          },
        },
      ],
    },
  };

  render() {
    const latestProductLastSevenDaysHistoryCardHeader = (
      <div className="card-header">
        <h5 className="card-category">Last 7 Days</h5>
        <h3 className="card-title">{this.state.product.name}</h3>
      </div>
    );
    return (
      <React.Fragment>
        <div className="row">
          <div className="col-12">
            <Card
              className="card card-chart"
              header={latestProductLastSevenDaysHistoryCardHeader}
            >
              <Chart
                type="line"
                data={this.state.product.history}
                options={
                  this.gradientChartOptionsConfigurationWithTooltipPurple
                }
                height="300"
              />
            </Card>
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
      </React.Fragment>
    );
  }
}
export default Dashboard;
