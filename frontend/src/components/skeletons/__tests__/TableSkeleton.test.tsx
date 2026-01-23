import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableSkeleton, TableSkeletonCompact } from "../TableSkeleton";

describe("TableSkeleton", () => {
  it("renders correct number of rows", () => {
    render(<TableSkeleton rows={5} columns={3} />);
    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(5);
  });

  it("renders correct number of columns per row", () => {
    render(<TableSkeleton rows={3} columns={4} />);
    const table = screen.getByRole("table");
    const firstRow = table.querySelector("tbody tr");
    const cells = firstRow?.querySelectorAll("td");
    expect(cells).toHaveLength(4);
  });

  it("renders header row when showHeader is true", () => {
    render(<TableSkeleton rows={3} columns={3} showHeader={true} />);
    const table = screen.getByRole("table");
    const headerCells = table.querySelectorAll("thead th");
    expect(headerCells).toHaveLength(3);
  });

  it("does not render header when showHeader is false", () => {
    render(<TableSkeleton rows={3} columns={3} showHeader={false} />);
    const table = screen.getByRole("table");
    const thead = table.querySelector("thead");
    expect(thead).toBeNull();
  });

  it("uses default values", () => {
    render(<TableSkeleton />);
    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");
    const headerCells = table.querySelectorAll("thead th");
    expect(rows).toHaveLength(5); // default rows
    expect(headerCells).toHaveLength(4); // default columns
  });

  it("adds extra column when showActions is true", () => {
    render(<TableSkeleton rows={2} columns={3} showActions={true} />);
    const table = screen.getByRole("table");
    const firstRow = table.querySelector("tbody tr");
    const cells = firstRow?.querySelectorAll("td");
    expect(cells).toHaveLength(4); // 3 + 1 for actions
  });
});

describe("TableSkeletonCompact", () => {
  it("renders correct number of rows", () => {
    render(<TableSkeletonCompact rows={4} />);
    const rows = document.querySelectorAll(".space-y-2 > div");
    expect(rows).toHaveLength(4);
  });

  it("renders skeleton elements in each row", () => {
    render(<TableSkeletonCompact rows={2} />);
    const firstRow = document.querySelector(".space-y-2 > div");
    const skeletons = firstRow?.querySelectorAll(".bg-muted");
    // Each row has: avatar circle (1) + two text lines (2) + badge (1) = 4
    expect(skeletons?.length).toBeGreaterThanOrEqual(3);
  });

  it("uses default 3 rows when not provided", () => {
    render(<TableSkeletonCompact />);
    const rows = document.querySelectorAll(".space-y-2 > div");
    expect(rows).toHaveLength(3);
  });

  it("applies custom className", () => {
    render(<TableSkeletonCompact className="custom-class" />);
    const container = document.querySelector(".space-y-2");
    expect(container).toHaveClass("custom-class");
  });
});
