import React, { Component } from "react";

class Counter extends Component {
  render() {
    const { counter, children, onIncrement, onDelete } = this.props;
    return (
      <div>
        {children}
        <span className="badge badge-primary m-2">{counter.value}</span>
        <button
          onClick={() => onIncrement(counter)}
          className="btn btn-secondary btn-sm"
        >
          Increment
        </button>
        <button
          onClick={() => onDelete(counter.id)}
          className="btn btn-danger btn-sm m-2"
        >
          Delete
        </button>
      </div>
    );
  }
}

export default Counter;
