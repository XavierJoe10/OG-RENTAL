// src/types/pdf-lib-augmentation.d.ts
// Augment pdf-lib types to include additional options not yet present
// in the version we're using (1.17.1).  The runtime library actually
// supports rounded corners via `borderRadius` but the bundled
// TypeScript definitions are missing it, causing compile errors.

import "pdf-lib";

declare module "pdf-lib" {
  export interface PDFPageDrawRectangleOptions {
    /**
     * Radius of the rectangle's corners.  The library accepts a number
     * which is applied to all four corners.
     */
    borderRadius?: number;
  }
}
