import { Component } from "react";

class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      number: 0,
    };
  }
  render() {
    const { number } = this.state;
    const addCounter = () => {
      // 동일한 형식의 명령을 두 번 반복해서 한 번에 2씩 증가
    };
    return (
      <div>
        <h1>{number}</h1>
        <button onClick={addCounter()}>+1</button>
      </div>
    );
  }
}

export default Counter;
