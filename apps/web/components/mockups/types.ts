import type { ReactNode } from "react";

export type MockupScreenProps = {
  children?: ReactNode;
  /** Screen image when children are not provided. */
  image?: string;
  imageAlt?: string;
  className?: string;
  /** Extra classes on the inner viewport when rendering children. */
  viewportClassName?: string;
  /**
   * When rendering children, enable vertical scroll inside the screen.
   * Defaults to true when `children` are provided.
   */
  screenScrollable?: boolean;
};
