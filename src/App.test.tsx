import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const map = vi.hoisted(() => ({
  destroy: vi.fn(),
  resetView: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
}));

vi.mock("./map/VenueMap", () => ({
  mountVenueMap: vi.fn(
    async (
      _host: HTMLElement,
      _venue: unknown,
      onZoomChange: (percent: number) => void,
    ) => {
      onZoomChange(100);
      return map;
    },
  ),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the local venue overview and accessible section list", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Soldier Field" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Interactive venue map" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(36);
  });
});
