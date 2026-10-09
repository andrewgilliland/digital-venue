import { Application, Container, Graphics, Text } from "pixi.js";
import { generateVenueSeats, type VenueSeat } from "../domain/seats";
import type { Venue, VenueDeck } from "../domain/venue";

const FIT_PADDING = 0.9;

export interface VenueMapController {
  focusSection(sectionId: string): void;
  setInspectedSeat(seatId: string | null): void;
  showOverview(): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  destroy(): void;
}

export interface VenueMapCallbacks {
  onZoomChange(percent: number): void;
  onSectionSelect?(sectionId: string): void;
  onSeatSelect?(seatId: string): void;
}

interface SectionScene {
  center: { x: number; y: number };
  label: Text;
  rowLayer: Container;
  seatLayer: Container;
  seatGraphics: Map<string, Graphics>;
  shape: Graphics;
}

export async function mountVenueMap(
  host: HTMLElement,
  venue: Venue,
  callbacks: VenueMapCallbacks,
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
  canvas.setAttribute("aria-label", `Interactive section map of ${venue.name}`);
  canvas.setAttribute("role", "img");
  canvas.style.display = "block";
  canvas.style.height = "100%";
  canvas.style.width = "100%";
  host.replaceChildren(canvas);

  const viewport = new Container();
  app.stage.addChild(viewport);
  let focusedSectionId: string | null = null;
  let inspectedSeatId: string | null = null;
  let animationFrame: number | null = null;
  let sectionScenes = new Map<string, SectionScene>();
  sectionScenes = drawVenue(
    viewport,
    venue,
    (sectionId) => {
      focusSection(sectionId);
      callbacks.onSectionSelect?.(sectionId);
    },
    (seatId) => {
      setInspectedSeat(seatId);
      callbacks.onSeatSelect?.(seatId);
    },
  );

  const {
    x: worldX,
    y: worldY,
    width: worldWidth,
    height: worldHeight,
  } = venue.viewBox;
  const overviewCenter = {
    x: worldX + worldWidth / 2,
    y: worldY + worldHeight / 2,
  };
  let fitScale = 1;
  let zoomFactor = 1;
  let draggingPointer: number | null = null;
  let dragX = 0;
  let dragY = 0;

  const reportZoom = () => callbacks.onZoomChange(Math.round(zoomFactor * 100));
  const updateSemanticVisibility = () => {
    sectionScenes.forEach((scene, sectionId) => {
      const focused = sectionId === focusedSectionId;
      scene.shape.alpha = focusedSectionId && !focused ? 0.38 : 1;
      scene.label.alpha = focusedSectionId && !focused ? 0.42 : 1;
      scene.label.visible = focusedSectionId === null;
      scene.rowLayer.visible = focused && zoomFactor >= 1.45;
      scene.seatLayer.visible = focused && zoomFactor >= 1.8;
      scene.seatGraphics.forEach((graphic, seatId) => {
        graphic.tint = seatId === inspectedSeatId ? 0x20242b : 0xffffff;
      });
    });
  };
  const layout = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;

    app.renderer.resize(width, height);
    fitScale = Math.min(width / worldWidth, height / worldHeight) * FIT_PADDING;
    viewport.scale.set(fitScale * zoomFactor);
    const focus = focusedSectionId
      ? sectionScenes.get(focusedSectionId)?.center
      : undefined;
    if (focus) {
      viewport.position.set(
        width / 2 - focus.x * viewport.scale.x,
        height / 2 - focus.y * viewport.scale.y,
      );
    } else {
      viewport.position.set(
        (width - worldWidth * fitScale * zoomFactor) / 2 -
          worldX * viewport.scale.x,
        (height - worldHeight * fitScale * zoomFactor) / 2 -
          worldY * viewport.scale.y,
      );
    }
  };

  const clampZoom = (value: number) => Math.min(6, Math.max(0.7, value));
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
    updateSemanticVisibility();
    reportZoom();
  };

  const resetView = () => {
    focusedSectionId = null;
    inspectedSeatId = null;
    zoomFactor = 1;
    layout();
    updateSemanticVisibility();
    reportZoom();
  };

  const animateTo = (
    targetZoom: number,
    worldPoint: { x: number; y: number },
  ) => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    const startTime = performance.now();
    const startZoom = zoomFactor;
    const startX = viewport.x;
    const startY = viewport.y;
    const nextZoom = clampZoom(targetZoom);
    const targetScale = fitScale * nextZoom;
    const targetX = host.clientWidth / 2 - worldPoint.x * targetScale;
    const targetY = host.clientHeight / 2 - worldPoint.y * targetScale;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / 320);
      const eased = 1 - Math.pow(1 - progress, 3);
      zoomFactor = startZoom + (nextZoom - startZoom) * eased;
      viewport.scale.set(fitScale * zoomFactor);
      viewport.position.set(
        startX + (targetX - startX) * eased,
        startY + (targetY - startY) * eased,
      );
      updateSemanticVisibility();
      reportZoom();
      animationFrame = progress < 1 ? requestAnimationFrame(step) : null;
    };

    animationFrame = requestAnimationFrame(step);
  };

  function focusSection(sectionId: string) {
    const scene = sectionScenes.get(sectionId);
    if (!scene) return;
    focusedSectionId = sectionId;
    inspectedSeatId = null;
    updateSemanticVisibility();
    animateTo(4.8, scene.center);
  }

  function setInspectedSeat(seatId: string | null) {
    inspectedSeatId = seatId;
    updateSemanticVisibility();
  }

  const showOverview = () => {
    focusedSectionId = null;
    inspectedSeatId = null;
    updateSemanticVisibility();
    animateTo(1, overviewCenter);
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
    focusSection,
    setInspectedSeat,
    showOverview,
    zoomIn: () => zoomAt(zoomFactor * 1.2),
    zoomOut: () => zoomAt(zoomFactor / 1.2),
    resetView,
    destroy: () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
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

function drawVenue(
  viewport: Container,
  venue: Venue,
  onSectionSelect: (sectionId: string) => void,
  onSeatSelect: (seatId: string) => void,
) {
  const background = new Graphics()
    .roundRect(
      venue.viewBox.x,
      venue.viewBox.y,
      venue.viewBox.width,
      venue.viewBox.height,
      28,
    )
    .fill({ color: 0xf7f8fa })
    .stroke({ color: 0xc8cdd7, width: 2 });
  viewport.addChild(background);

  drawField(viewport, venue);

  const sectionScenes = new Map<string, SectionScene>();
  venue.decks.forEach((deck, deckIndex) => {
    drawDeck(viewport, deck, deckIndex, sectionScenes, onSectionSelect);
  });
  drawSectionDetails(viewport, venue, sectionScenes, onSeatSelect);
  return sectionScenes;
}

function drawDeck(
  viewport: Container,
  deck: VenueDeck,
  deckIndex: number,
  sectionScenes: Map<string, SectionScene>,
  onSectionSelect: (sectionId: string) => void,
) {
  const colors = [0xdce2e9, 0xd4dbe4, 0xe1e4e8, 0xd7dde5];
  const color = colors[deckIndex % colors.length];

  deck.sections.forEach((section, index) => {
    const points = section.polygon.flatMap((point) => [point.x, point.y]);

    const shape = new Graphics()
      .poly(points)
      .fill({ color: index % 2 === 0 ? color : lighten(color, 5) })
      .stroke({ color: 0xf8f9fb, width: 2 });
    shape.eventMode = "static";
    shape.cursor = "pointer";
    shape.on("pointertap", () => onSectionSelect(section.id));
    viewport.addChild(shape);

    const label = new Text({
      text: section.name,
      style: {
        fill: "#667080",
        fontFamily: "Arial, sans-serif",
        fontSize: 9,
        fontWeight: "500",
      },
    });
    label.anchor.set(0.5);
    const sectionCenter = section.label;
    label.position.set(sectionCenter.x, sectionCenter.y);
    viewport.addChild(label);

    const rowLayer = new Container();
    const seatLayer = new Container();
    rowLayer.visible = false;
    seatLayer.visible = false;
    viewport.addChild(rowLayer, seatLayer);
    sectionScenes.set(section.id, {
      center: {
        x: sectionCenter.x,
        y: sectionCenter.y,
      },
      label,
      rowLayer,
      seatLayer,
      seatGraphics: new Map(),
      shape,
    });
  });
}

function drawSectionDetails(
  viewport: Container,
  venue: Venue,
  sectionScenes: Map<string, SectionScene>,
  onSeatSelect: (seatId: string) => void,
) {
  const seats = generateVenueSeats(venue);

  for (const deck of venue.decks) {
    for (const section of deck.sections) {
      if (section.rows.length === 0) continue;
      const scene = sectionScenes.get(section.id);
      if (!scene) continue;
      const sectionSeats = seats.filter(
        (seat) => seat.sectionId === section.id,
      );

      for (const row of section.rows) {
        const rowSeats = sectionSeats.filter((seat) => seat.rowId === row.id);
        drawRow(scene, rowSeats);
        for (const seat of rowSeats) {
          const graphic = new Graphics()
            .circle(seat.position.x, seat.position.y, 0.72)
            .fill({ color: 0xffffff })
            .stroke({ color: 0x596171, width: 0.35 });
          graphic.eventMode = "static";
          graphic.cursor = "pointer";
          graphic.on("pointertap", () => onSeatSelect(seat.id));
          scene.seatLayer.addChild(graphic);
          scene.seatGraphics.set(seat.id, graphic);
        }
      }
    }
  }

  viewport.addChild(
    ...Array.from(sectionScenes.values()).flatMap((scene) => [
      scene.rowLayer,
      scene.seatLayer,
    ]),
  );
}

function drawRow(scene: SectionScene, seats: VenueSeat[]) {
  if (seats.length === 0) return;
  const path = new Graphics();
  seats.forEach((seat, index) => {
    if (index === 0) path.moveTo(seat.position.x, seat.position.y);
    else path.lineTo(seat.position.x, seat.position.y);
  });
  path.stroke({ color: 0x8b93a1, alpha: 0.55, width: 1 });
  scene.rowLayer.addChild(path);
}

function drawField(viewport: Container, venue: Venue) {
  const { width, height, label } = venue.field;
  const fieldCenterX = venue.center.x + venue.field.offsetX;
  const fieldCenterY = venue.center.y + venue.field.offsetY;
  const left = fieldCenterX - width / 2;
  const top = fieldCenterY - height / 2;
  const field = new Graphics()
    .roundRect(left, top, width, height, 8)
    .fill({ color: 0x6c855f })
    .stroke({ color: 0xffffff, width: 7 });
  viewport.addChild(field);

  const markings = new Graphics();
  const inset = 13;
  for (let index = 1; index < 12; index += 1) {
    if (width >= height) {
      const x = left + (width * index) / 12;
      markings.moveTo(x, top + inset).lineTo(x, top + height - inset);
    } else {
      const y = top + (height * index) / 12;
      markings.moveTo(left + inset, y).lineTo(left + width - inset, y);
    }
  }
  markings.stroke({ color: 0xf4f5ee, alpha: 0.48, width: 1.4 });
  if (width >= height) {
    markings
      .moveTo(fieldCenterX, top + inset)
      .lineTo(fieldCenterX, top + height - inset)
      .stroke({ color: 0xffffff, alpha: 0.72, width: 2 });
  } else {
    markings
      .moveTo(left + inset, fieldCenterY)
      .lineTo(left + width - inset, fieldCenterY)
      .stroke({ color: 0xffffff, alpha: 0.72, width: 2 });
  }
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
  fieldLabel.position.set(fieldCenterX, top + 20);
  viewport.addChild(fieldLabel);
}

function lighten(color: number, amount: number) {
  const red = Math.min(255, ((color >> 16) & 0xff) + amount);
  const green = Math.min(255, ((color >> 8) & 0xff) + amount);
  const blue = Math.min(255, (color & 0xff) + amount);
  return (red << 16) | (green << 8) | blue;
}
