import { useEffect, useRef, useState } from "react";
import { createSoldierFieldVenue } from "./data/venues/soldierField";
import { generateVenueSeats, type VenueSeat } from "./domain/seats";
import { VenueSchema } from "./domain/venue";
import { mountVenueMap, type VenueMapController } from "./map/VenueMap";

const venueResult = VenueSchema.safeParse(createSoldierFieldVenue());

function App() {
  const mapHost = useRef<HTMLDivElement>(null);
  const mapController = useRef<VenueMapController | null>(null);
  const focusedSectionIdRef = useRef<string | null>(null);
  const inspectedSeatIdRef = useRef<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [inspectedSeatId, setInspectedSeatId] = useState<string | null>(null);

  useEffect(() => {
    const host = mapHost.current;
    if (!host || !venueResult.success) return;

    const abortController = new AbortController();
    let disposed = false;
    void mountVenueMap(
      host,
      venueResult.data,
      {
        onZoomChange: setZoomPercent,
        onSectionSelect: (sectionId) => {
          focusedSectionIdRef.current = sectionId;
          inspectedSeatIdRef.current = null;
          setFocusedSectionId(sectionId);
          setInspectedSeatId(null);
        },
        onSeatSelect: (seatId) => {
          const seat = generateVenueSeats(venueResult.data).find(
            (candidate) => candidate.id === seatId,
          );
          if (!seat) return;
          focusedSectionIdRef.current = seat.sectionId;
          inspectedSeatIdRef.current = seat.id;
          setFocusedSectionId(seat.sectionId);
          setInspectedSeatId(seat.id);
        },
      },
      abortController.signal,
    )
      .then((controller) => {
        if (disposed || abortController.signal.aborted) {
          controller.destroy();
          return;
        }
        mapController.current = controller;
        if (focusedSectionIdRef.current) {
          controller.focusSection(focusedSectionIdRef.current);
        }
        if (inspectedSeatIdRef.current) {
          controller.setInspectedSeat(inspectedSeatIdRef.current);
        }
      })
      .catch((error: unknown) => {
        if (disposed || abortController.signal.aborted) return;
        setMapError(
          error instanceof Error
            ? error.message
            : "The interactive map could not be started.",
        );
      });

    return () => {
      disposed = true;
      abortController.abort();
      mapController.current?.destroy();
      mapController.current = null;
    };
  }, []);

  if (!venueResult.success) {
    const details = venueResult.error.issues
      .map((issue) => `${issue.path.join(".") || "venue"}: ${issue.message}`)
      .join("; ");

    return (
      <main className="grid min-h-screen place-items-center bg-neutral-100 p-6 text-neutral-900">
        <section
          className="max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm"
          role="alert"
        >
          <h1 className="text-xl font-semibold">
            Venue data could not be loaded
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            The local venue data is invalid. {details}
          </p>
        </section>
      </main>
    );
  }

  const venue = venueResult.data;
  const allSections = venue.decks.flatMap((deck) =>
    deck.sections.map((section) => ({
      ...section,
      deckId: deck.id,
      deckName: deck.name,
    })),
  );
  const venueSeats = generateVenueSeats(venue);
  const focusedSection = allSections.find(
    (section) => section.id === focusedSectionId,
  );
  const focusedSeats = focusedSection
    ? venueSeats.filter((seat) => seat.sectionId === focusedSection.id)
    : [];
  const inspectedSeat = focusedSeats.find(
    (seat) => seat.id === inspectedSeatId,
  );

  const focusSection = (sectionId: string) => {
    focusedSectionIdRef.current = sectionId;
    inspectedSeatIdRef.current = null;
    setFocusedSectionId(sectionId);
    setInspectedSeatId(null);
    mapController.current?.focusSection(sectionId);
  };

  const inspectSeat = (seat: VenueSeat) => {
    inspectedSeatIdRef.current = seat.id;
    setInspectedSeatId(seat.id);
    mapController.current?.setInspectedSeat(seat.id);
  };

  const showOverview = () => {
    focusedSectionIdRef.current = null;
    inspectedSeatIdRef.current = null;
    setFocusedSectionId(null);
    setInspectedSeatId(null);
    mapController.current?.showOverview();
  };

  return (
    <div className="min-h-screen bg-[#eef0f4] text-neutral-900">
      <header className="flex h-16 items-center justify-between border-b border-neutral-200/80 bg-white px-5 sm:px-8">
        <a
          className="flex items-center gap-3"
          href="/"
          aria-label="Digital Venue home"
        >
          <span
            className="grid size-9 place-items-center rounded-xl bg-neutral-900 text-white"
            aria-hidden="true"
          >
            <VenueMark />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Digital Venue
          </span>
        </a>
        <p className="hidden text-xs font-medium text-neutral-500 sm:block">
          VENUE EXPLORER · PROTOTYPE
        </p>
      </header>

      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[1700px] flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <section
          className="relative min-h-[58vh] flex-1 overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#e8ebf1] shadow-[0_18px_60px_-38px_rgba(36,42,54,0.45)] lg:min-h-[calc(100svh-7rem)]"
          aria-label="Interactive venue map"
          role="region"
        >
          <div ref={mapHost} className="absolute inset-0 touch-none" />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
            <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-neutral-500 uppercase">
                {focusedSection
                  ? `Section ${focusedSection.name}`
                  : "Venue overview"}
              </p>
              <p className="mt-1 text-sm font-semibold">{venue.name}</p>
            </div>
            <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md">
              <button
                aria-label="Zoom in"
                className="grid size-11 place-items-center text-neutral-700 transition hover:bg-neutral-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-neutral-900"
                onClick={() => mapController.current?.zoomIn()}
                type="button"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  +
                </span>
              </button>
              <div className="h-px bg-neutral-200" />
              <button
                aria-label="Zoom out"
                className="grid size-11 place-items-center text-neutral-700 transition hover:bg-neutral-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-neutral-900"
                onClick={() => mapController.current?.zoomOut()}
                type="button"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  −
                </span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-3 sm:bottom-6 sm:left-6">
            <button
              className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              onClick={() => mapController.current?.resetView()}
              type="button"
            >
              Reset view
            </button>
            <span
              aria-label="Map zoom"
              className="rounded-lg bg-white/80 px-2 py-1 text-xs tabular-nums text-neutral-500"
              role="status"
            >
              {zoomPercent}%
            </span>
          </div>

          {mapError && (
            <div
              className="absolute inset-x-4 bottom-16 rounded-xl border border-amber-200 bg-white/95 p-3 text-sm text-amber-950 shadow-sm sm:inset-x-6 sm:bottom-20"
              role="alert"
            >
              <p className="font-semibold">WebGL is unavailable</p>
              <p className="mt-1 text-xs text-amber-900/80">
                The interactive map could not start. Use the venue section list
                to review the available layout information.
              </p>
            </div>
          )}
        </section>

        <aside className="flex w-full shrink-0 flex-col rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_18px_60px_-38px_rgba(36,42,54,0.35)] sm:p-6 lg:w-84">
          {focusedSection ? (
            <>
              <button
                aria-label="Back to venue overview"
                className="self-start text-xs font-semibold text-neutral-500 transition hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
                onClick={showOverview}
                type="button"
              >
                ← Back to venue overview
              </button>
              <p className="mt-6 text-[10px] font-semibold tracking-[0.18em] text-neutral-400 uppercase">
                {focusedSection.deckName}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Section {focusedSection.name}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                {focusedSection.rows.length} rows · {focusedSeats.length} seats
              </p>

              {inspectedSeat && (
                <section
                  aria-label="Inspected seat details"
                  className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <p className="text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
                    Seat details
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Seat {inspectedSeat.number}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Section {inspectedSeat.sectionName} · Row{" "}
                    {inspectedSeat.rowName}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {inspectedSeat.deckName}
                  </p>
                </section>
              )}

              {focusedSection.rows.length > 0 ? (
                <div className="mt-5 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
                  {focusedSection.rows.map((row) => {
                    const rowSeats = focusedSeats.filter(
                      (seat) => seat.rowId === row.id,
                    );
                    return (
                      <section aria-label={`Row ${row.name}`} key={row.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <h2 className="text-xs font-semibold">
                            Row {row.name}
                          </h2>
                          <span className="text-[10px] text-neutral-400">
                            {rowSeats.length} seats
                          </span>
                        </div>
                        <div className="grid grid-cols-8 gap-1.5">
                          {rowSeats.map((seat) => (
                            <button
                              aria-label={`Inspect Section ${seat.sectionName} Row ${seat.rowName} Seat ${seat.number}`}
                              aria-pressed={seat.id === inspectedSeatId}
                              className="aspect-square rounded-md border border-neutral-200 bg-white text-[10px] font-medium tabular-nums text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 aria-pressed:border-neutral-900 aria-pressed:bg-neutral-900 aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                              key={seat.id}
                              onClick={() => inspectSeat(seat)}
                              type="button"
                            >
                              {seat.number}
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-neutral-50 p-4 text-xs leading-5 text-neutral-500">
                  This Section remains available in the venue overview. Detailed
                  Row and Seat geometry is modeled for Sections 110, 122, and
                  430.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-neutral-400 uppercase">
                Explore venue
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {venue.name}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                {venue.location.city}, {venue.location.state}
              </p>

              <div
                className="mt-6 grid grid-cols-3 gap-2"
                aria-label="Venue deck overview"
              >
                {venue.decks.map((deck) => (
                  <div
                    className="rounded-xl bg-neutral-50 px-3 py-3"
                    key={deck.id}
                  >
                    <p className="text-[10px] font-medium text-neutral-500">
                      {deck.shortName}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {deck.sections.length}
                    </p>
                    <p className="text-[10px] text-neutral-400">sections</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-neutral-100 pt-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Venue areas</h2>
                  <span className="text-xs text-neutral-400">
                    {allSections.length} sections
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  Select a Section to focus the map and inspect available
                  detail.
                </p>
              </div>

              <details className="group mt-4 rounded-xl border border-neutral-200">
                <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-neutral-700 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
                  <span className="flex items-center justify-between">
                    Browse all {allSections.length} sections
                    <span
                      aria-hidden="true"
                      className="text-neutral-400 transition group-open:rotate-180"
                    >
                      ⌄
                    </span>
                  </span>
                </summary>
                <div className="max-h-64 overflow-y-auto border-t border-neutral-100 px-4 py-3">
                  {venue.decks.map((deck) => (
                    <section
                      aria-label={deck.name}
                      className="mb-4 last:mb-0"
                      key={deck.id}
                    >
                      <h3 className="mb-2 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
                        {deck.name}
                      </h3>
                      <ul
                        aria-label={`${deck.name} sections`}
                        className="grid grid-cols-4 gap-1.5"
                      >
                        {deck.sections.map((section) => (
                          <li key={section.id}>
                            <button
                              aria-label={`View Section ${section.name}`}
                              className="w-full rounded-md bg-neutral-50 px-1.5 py-1 text-center text-[11px] font-medium tabular-nums text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                              onClick={() => focusSection(section.id)}
                              type="button"
                            >
                              {section.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </details>

              <div className="mt-auto border-t border-neutral-100 pt-5">
                <p className="text-xs leading-5 text-neutral-400">
                  Drag to move around · scroll or use + / − to zoom
                </p>
                <p className="mt-2 text-[10px] text-neutral-400">
                  SVG section geometry · prototype seat data
                </p>
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

function VenueMark() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 20 20"
      width="18"
    >
      <path
        d="M3 6.5c3.8-3.8 10.2-3.8 14 0M4.5 9c3-3 8-3 11 0M6 11.5c2.2-2.2 5.8-2.2 8 0M8.1 14a2.7 2.7 0 0 1 3.8 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <circle cx="10" cy="16.4" fill="currentColor" r="1" />
    </svg>
  );
}

export default App;
