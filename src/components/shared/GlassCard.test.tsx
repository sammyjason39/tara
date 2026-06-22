import { describe, expect, it } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";

import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardFooter,
  GlassCardHeader,
  GlassCardTitle,
} from "./GlassCard";

describe("GlassCard", () => {
  it("renders children inside a uniform glass-card surface by default", () => {
    render(<GlassCard data-testid="surface">Body</GlassCard>);

    const surface = screen.getByTestId("surface");
    expect(surface).toHaveTextContent("Body");
    expect(surface).toHaveClass("glass-card");
  });

  it("uses the glass-morphism surface when the morphism variant is selected", () => {
    render(
      <GlassCard data-testid="surface" variant="morphism">
        Body
      </GlassCard>,
    );

    const surface = screen.getByTestId("surface");
    expect(surface).toHaveClass("glass-morphism");
    expect(surface).not.toHaveClass("glass-card");
  });

  it("merges a caller-provided className with the surface class", () => {
    render(
      <GlassCard data-testid="surface" className="custom-spacing">
        Body
      </GlassCard>,
    );

    const surface = screen.getByTestId("surface");
    expect(surface).toHaveClass("glass-card");
    expect(surface).toHaveClass("custom-spacing");
  });

  it("forwards native div props and the ref to the underlying element", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <GlassCard ref={ref} role="region" aria-label="metrics">
        Body
      </GlassCard>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(screen.getByRole("region", { name: "metrics" })).toBeInTheDocument();
  });

  it("composes with the re-exported structural parts", () => {
    render(
      <GlassCard data-testid="surface">
        <GlassCardHeader>
          <GlassCardTitle>Title</GlassCardTitle>
          <GlassCardDescription>Description</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>Content</GlassCardContent>
        <GlassCardFooter>Footer</GlassCardFooter>
      </GlassCard>,
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});
