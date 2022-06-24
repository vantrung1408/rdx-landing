import React from "react";
import "./button.css";

export const Button = function ({
  type,
  ...inputProps
}: {
  type: "button" | "submit";
  [key: string]: any;
}) {
  return <input className="button-base" type={type} {...inputProps} />;
};
