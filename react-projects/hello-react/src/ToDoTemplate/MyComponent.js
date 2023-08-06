import PropTypes from "prop-types";
import React, { Fragment } from "react";
import Counter from "./Counter";

const MyComponent = ({ name, favoriteNumber, children }) => {
  return (
    <Fragment>
      <div>Hello, My Name is {name}</div>
      <div>My children value is {children}</div>
      <div>My favoriteNumber is {favoriteNumber}</div>
      <Counter/>
    </Fragment>
  );
};

MyComponent.defaultProps = {
  name: "" + 7 + 3,
  favoriteNumber: 7 + 3,
};

MyComponent.propTypes = {
  name: PropTypes.string,
  children: PropTypes.string.isRequired,
  favoriteNumber: PropTypes.number,
};

export default MyComponent;
