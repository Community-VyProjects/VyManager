import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonText, SkeletonCircle } from "../skeleton";

describe("Skeleton", () => {
  it("renders with default classes", () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass("rounded-md", "bg-muted", "animate-pulse");
  });

  it("renders without animation when animate is false", () => {
    render(<Skeleton data-testid="skeleton" animate={false} />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).not.toHaveClass("animate-pulse");
  });

  it("merges custom classes", () => {
    render(<Skeleton data-testid="skeleton" className="h-10 w-full" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("h-10", "w-full");
  });
});

describe("SkeletonText", () => {
  it("renders default single line", () => {
    render(<SkeletonText data-testid="skeleton-text" />);
    const container = screen.getByTestId("skeleton-text");
    // With default lines=1, there should be 1 skeleton
    const skeletons = container.querySelectorAll(".bg-muted");
    expect(skeletons).toHaveLength(1);
  });

  it("renders specified number of lines", () => {
    render(<SkeletonText data-testid="skeleton-text" lines={5} />);
    const container = screen.getByTestId("skeleton-text");
    const skeletons = container.querySelectorAll(".bg-muted");
    expect(skeletons).toHaveLength(5);
  });

  it("last line is shorter when multiple lines", () => {
    render(<SkeletonText data-testid="skeleton-text" lines={3} />);
    const container = screen.getByTestId("skeleton-text");
    const skeletons = container.querySelectorAll(".bg-muted");
    const lastLine = skeletons[skeletons.length - 1];
    expect(lastLine).toHaveClass("w-3/4");
  });

  it("single line is full width", () => {
    render(<SkeletonText data-testid="skeleton-text" lines={1} />);
    const container = screen.getByTestId("skeleton-text");
    const skeletons = container.querySelectorAll(".bg-muted");
    expect(skeletons[0]).toHaveClass("w-full");
  });
});

describe("SkeletonCircle", () => {
  it("renders with default size (md)", () => {
    render(<SkeletonCircle data-testid="skeleton-circle" />);
    const circle = screen.getByTestId("skeleton-circle");
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveClass("rounded-full", "h-10", "w-10");
  });

  it("renders with small size", () => {
    render(<SkeletonCircle data-testid="skeleton-circle" size="sm" />);
    const circle = screen.getByTestId("skeleton-circle");
    expect(circle).toHaveClass("h-6", "w-6");
  });

  it("renders with large size", () => {
    render(<SkeletonCircle data-testid="skeleton-circle" size="lg" />);
    const circle = screen.getByTestId("skeleton-circle");
    expect(circle).toHaveClass("h-12", "w-12");
  });

  it("renders with xl size", () => {
    render(<SkeletonCircle data-testid="skeleton-circle" size="xl" />);
    const circle = screen.getByTestId("skeleton-circle");
    expect(circle).toHaveClass("h-16", "w-16");
  });
});
