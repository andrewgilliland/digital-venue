import { Application, Container, Graphics, Text } from "pixi.js";
import type { Venue, VenueDeck } from "../domain/venue";

const FIT_PADDING = 0.9;

export interface VenueMapController {
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  destroy(): void;
}

export async function mountVenueMap(
  host: HTMLElement,
  venue: Venue,
  onZoomChange: (percent: number) => void,
  signal?: AbortSignal,
): Promise<VenueMapController> {
  if (signal?.aborted) {
    throw new DOMException("Map initialization aborted.", "AbortError");
  }

  const capabilityProbe = document.createElement("canvas");
  const webglContext =
    capabilityProbe.getContext("webgl2") ?? capabilityProbe.getContext("webgl");
  if (!webglContext) {
    throw new Error("WebGL is unavailable in this browser.");
  }

  const app = new Application();
  await app.init({
    antialias: true,
    autoDensity: true,
    background: "#e8ebf1",
    height: host.clientHeight || 720,
    preference: "webgl",
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    width: host.clientWidth || 960,
  });

  if (signal?.aborted) {
    app.destroy({ removeView: true }, { children: true });
    throw new DOMException("Map initialization aborted.", "AbortError");
  }

  const canvas = app.canvas;
  canvas.setAttribute("aria-label", `Top-down schematic map of ${venue.name}`);
  canvas.setAttribute("role", "img");
  canvas.style.display = "block";
  canvas.style.height = "100%";
  canvas.style.width = "100%";
  host.replaceChildren(canvas);

  const viewport = new Container();
  app.stage.addChild(viewport);
  drawVenue(viewport, venue);

  const { width: worldWidth, height: worldHeight } = venue.viewBox;
  let fitScale = 1;
  let zoomFactor = 1;
  let draggingPointer: number | null = null;
  let dragX = 0;
  let dragY = 0;

  const reportZoom = () => onZoomChange(Math.round(zoomFactor * 100));
  const layout = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;

    app.renderer.resize(width, height);
    fitScale = Math.min(width / worldWidth, height / worldHeight) * FIT_PADDING;
    viewport.scale.set(fitScale * zoomFactor);
    viewport.position.set(
      (width - worldWidth * fitScale * zoomFactor) / 2,
      (height - worldHeight * fitScale * zoomFactor) / 2,
    );
  };

  const clampZoom = (value: number) => Math.min(2.8, Math.max(0.7, value));
  const zoomAt = (
    nextFactor: number,
    x = host.clientWidth / 2,
    y = host.clientHeight / 2,
  ) => {
    const clamped = clampZoom(nextFactor);
    const worldX = (x - viewport.x) / viewport.scale.x;
    const worldY = (y - viewport.y) / viewport.scale.y;
    zoomFactor = clamped;
    viewport.scale.set(fitScale * zoomFactor);
    viewport.position.set(
      x - worldX * viewport.scale.x,
      y - worldY * viewport.scale.y,
    );
    reportZoom();
  };

  const resetView = () => {
    zoomFactor = 1;
    layout();
    reportZoom();
  };

  const onPointerDown = (event: PointerEvent) => {
    draggingPointer = event.pointerId;
    dragX = event.clientX;
    dragY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };

  const onPointerMove = (event: PointerEvent) => {
    if (draggingPointer !== event.pointerId) return;
    viewport.x += event.clientX - dragX;
    viewport.y += event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (draggingPointer !== event.pointerId) return;
    draggingPointer = null;
    canvas.style.cursor = "grab";
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const rectangle = canvas.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(
      zoomFactor * factor,
      event.clientX - rectangle.left,
      event.clientY - rectangle.top,
    );
  };

  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  const observer = new ResizeObserver(layout);
  observer.observe(host);
  layout();
  reportZoom();

  return {
    zoomIn: () => zoomAt(zoomFactor * 1.2),
    zoomOut: () => zoomAt(zoomFactor / 1.2),
    resetView,
    destroy: () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      app.destroy({ removeView: true }, { children: true });
      if (host.contains(canvas)) host.removeChild(canvas);
    },
  };
}

function drawVenue(viewport: Container, venue: Venue) {
  const { x: centerX, y: centerY } = venue.center;
  const widestDeck = venue.decks.reduce((widest, deck) =>
    deck.outerRadiusX > widest.outerRadiusX ? deck : widest,
  );

  const shadow = new Graphics()
    .ellipse(
      centerX,
      centerY + 7,
      widestDeck.outerRadiusX + 4,
      widestDeck.outerRadiusY + 4,
    )
    .fill({ color: 0xb8bec9, alpha: 0.42 });
  viewport.addChild(shadow);

  const outerShape = new Graphics()
    .ellipse(centerX, centerY, widestDeck.outerRadiusX, widestDeck.outerRadiusY)
    .fill({ color: 0xf7f8fa })
    .stroke({ color: 0xc8cdd7, width: 2 });
  viewport.addChild(outerShape);

  venue.decks.forEach((deck, deckIndex) =>
    drawDeck(viewport, venue, deck, deckIndex),
  );
  drawField(viewport, venue);
}

function drawDeck(
  viewport: Container,
  venue: Venue,
  deck: VenueDeck,
  deckIndex: number,
) {
  const colors = [0xd9dde4, 0xd2d7df, 0xe0e3e8];
  const color = colors[deckIndex % colors.length];

  deck.sections.forEach((section, index) => {
    const points = annularSectorPoints(
      venue.center.x,
      venue.center.y,
      deck.innerRadiusX,
      deck.innerRadiusY,
      deck.outerRadiusX,
      deck.outerRadiusY,
      section.startAngle + 0.012,
      section.endAngle - 0.012,
    );

    const shape = new Graphics()
      .poly(points)
      .fill({ color: index % 2 === 0 ? color : lighten(color, 5) })
      .stroke({ color: 0xf8f9fb, width: 2 });
    viewport.addChild(shape);

    const midpoint = (section.startAngle + section.endAngle) / 2;
    const radiusX = (deck.innerRadiusX + deck.outerRadiusX) / 2;
    const radiusY = (deck.innerRadiusY + deck.outerRadiusY) / 2;
    const label = new Text({
      text: section.name,
      style: {
        fill: "#667080",
        fontFamily: "Arial, sans-serif",
        fontSize: 13,
        fontWeight: "500",
      },
    });
    label.anchor.set(0.5);
    label.position.set(
      venue.center.x + Math.cos(midpoint) * radiusX,
      venue.center.y + Math.sin(midpoint) * radiusY,
    );
    viewport.addChild(label);
  });
}

function drawField(viewport: Container, venue: Venue) {
  const { width, height, label } = venue.field;
  const left = venue.center.x - width / 2;
  const top = venue.center.y - height / 2;
  const field = new Graphics()
    .roundRect(left, top, width, height, 8)
    .fill({ color: 0x6c855f })
    .stroke({ color: 0xffffff, width: 7 });
  viewport.addChild(field);

  const markings = new Graphics();
  const inset = 13;
  for (let index = 1; index < 12; index += 1) {
    const y = top + (height * index) / 12;
    markings.moveTo(left + inset, y).lineTo(left + width - inset, y);
  }
  markings.stroke({ color: 0xf4f5ee, alpha: 0.48, width: 1.4 });
  markings
    .moveTo(left + inset, venue.center.y)
    .lineTo(left + width - inset, venue.center.y)
    .stroke({ color: 0xffffff, alpha: 0.72, width: 2 });
  viewport.addChild(markings);

  const fieldLabel = new Text({
    text: label,
    style: {
      fill: "#f8f8f2",
      fontFamily: "Arial, sans-serif",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 2,
    },
  });
  fieldLabel.anchor.set(0.5);
  fieldLabel.position.set(venue.center.x, top + 20);
  viewport.addChild(fieldLabel);
}

function annularSectorPoints(
  centerX: number,
  centerY: number,
  innerRadiusX: number,
  innerRadiusY: number,
  outerRadiusX: number,
  outerRadiusY: number,
  startAngle: number,
  endAngle: number,
) {
  const steps = Math.max(4, Math.ceil((endAngle - startAngle) / 0.07));
  const points: number[] = [];

  for (let index = 0; index <= steps; index += 1) {
    const angle = startAngle + ((endAngle - startAngle) * index) / steps;
    points.push(
      centerX + Math.cos(angle) * outerRadiusX,
      centerY + Math.sin(angle) * outerRadiusY,
    );
  }
  for (let index = steps; index >= 0; index -= 1) {
    const angle = startAngle + ((endAngle - startAngle) * index) / steps;
    points.push(
      centerX + Math.cos(angle) * innerRadiusX,
      centerY + Math.sin(angle) * innerRadiusY,
    );
  }

  return points;
}

function lighten(color: number, amount: number) {
  const red = Math.min(255, ((color >> 16) & 0xff) + amount);
  const green = Math.min(255, ((color >> 8) & 0xff) + amount);
  const blue = Math.min(255, (color & 0xff) + amount);
  return (red << 16) | (green << 8) | blue;
}
