import { join } from "path";
import { Children, isValidElement, cloneElement } from "react";
import satori from "satori";
import { tailwindToCSS } from "tw-to-css";
import fs from 'fs/promises'
import { Resvg } from "@resvg/resvg-js";
import { Frame } from "./templates/Frame";
import { fontsPath } from "../utils/path";

const { twj } = tailwindToCSS({});

// from https://mahadk.com/posts/satori-with-tailwind-config
export const inlineTailwind = (el: JSX.Element): JSX.Element => {
  const { className, children, style: originalStyle, ...props } = el.props;
  // Generate style from the `tw` prop
  const twStyle = className ? twj(className.split(" ")) : {};
  // Merge original and generated styles
  const mergedStyle = { ...originalStyle, ...twStyle };
  // Recursively process children
  const processedChildren = Children.map(children, (child) =>
    isValidElement(child) ? inlineTailwind(child as JSX.Element) : child,
  );
  // Return cloned element with updated props
  return cloneElement(el, { ...props, style: mergedStyle }, processedChildren);
}

export const renderTemplate = async (el: JSX.Element): Promise<Buffer> => {
  const svg = await satori(inlineTailwind(Frame({ children: el })), {
    fonts: [
      {
        name: 'Unifont',
        data: await fs.readFile(join(fontsPath, 'unifont-17.0.03.otf')),
      }
    ],
    width: 300,
    height: 100
  })
  const png = new Resvg(svg, {
    fitTo: {
      mode: 'zoom',
      value: 2,
    },
  }).render().asPng()
  return png
}