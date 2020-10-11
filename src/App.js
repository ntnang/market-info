import React, { Component } from "react";
import "./App.css";
import Tiki from "./components/price-tracking/tiki";
import Shopee from "./components/price-tracking/shopee";

class App extends Component {
  state = {
    counters: [
      { id: 1, value: 0 },
      { id: 2, value: 0 },
      { id: 3, value: 0 },
      { id: 4, value: 0 },
    ],
  };
  handleIncrement = (counter) => {
    const counters = [...this.state.counters];
    const index = counters.indexOf(counter);
    counters[index] = { ...counter };
    counters[index].value++;
    this.setState({ counters });
  };
  handleReset = () => {
    const counters = this.state.counters.map((counter) => {
      counter.value = 0;
      return counter;
    });
    this.setState({ counters });
  };
  handleDelete = (counterId) => {
    const updatedCounters = this.state.counters.filter(
      (counter) => counter.id !== counterId
    );
    this.setState({ counters: updatedCounters });
  };
  render() {
    return (
      <React.Fragment>
        <Tiki />
        <Shopee />
      </React.Fragment>
    );
  }
}

export default App;
