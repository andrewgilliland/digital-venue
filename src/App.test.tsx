import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { mountVenueMap, type VenueMapController } from "./map/VenueMap";

const map = vi.hoisted(() => ({
  destroy: vi.fn(),
  focusSection: vi.fn(),
  resetView: vi.fn(),
  setInspectedSeat: vi.fn(),
  showOverview: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
}));

vi.mock("./map/VenueMap", () => ({
  mountVenueMap: vi.fn(
    async (
      _host: HTMLElement,
      _venue: unknown,
      callbacks: { onZoomChange: (percent: number) => void },
    ) => {
      callbacks.onZoomChange(100);
      return map;
    },
  ),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("renders the local venue overview and accessible section list", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Soldier Field" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Interactive venue map" }),
    ).toBeInTheDocument();
    await user.click(screen.getByText("Browse all 36 sections"));
    expect(screen.getAllByRole("listitem")).toHaveLength(36);
  });

  it("focuses a detailed section, inspects a seat, and returns to the overview", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Browse all 36 sections"));
    await user.click(screen.getByRole("button", { name: "View Section 110" }));

    expect(
      screen.getByRole("heading", { name: "Section 110" }),
    ).toBeInTheDocument();
    expect(screen.getByText("100 Level")).toBeInTheDocument();
    expect(map.focusSection).toHaveBeenCalledWith("lower-110");

    await user.click(
      screen.getByRole("button", {
        name: "Inspect Section 110 Row 1 Seat 1",
      }),
    );

    expect(screen.getByRole("heading", { name: "Seat 1" })).toBeInTheDocument();
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(map.setInspectedSeat).toHaveBeenCalledWith("lower-110-row-1-seat-1");

    await user.click(
      screen.getByRole("button", { name: "Back to venue overview" }),
    );

    expect(map.showOverview).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("heading", { name: "Section 110" }),
    ).not.toBeInTheDocument();
  });

  it("synchronizes a section selected before the map finishes mounting", async () => {
    const user = userEvent.setup();
    let resolveMap!: (controller: VenueMapController) => void;
    vi.mocked(mountVenueMap).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMap = resolve;
        }),
    );
    render(<App />);

    await user.click(screen.getByText("Browse all 36 sections"));
    await user.click(screen.getByRole("button", { name: "View Section 110" }));
    expect(map.focusSection).not.toHaveBeenCalled();

    await act(async () => resolveMap(map));

    expect(map.focusSection).toHaveBeenCalledWith("lower-110");
  });
});
