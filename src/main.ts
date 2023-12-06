import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, Coin } from "./board";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 5;
const PIT_SPAWN_PROBABILITY = 0.1;

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    map.setView(playerMarker.getLatLng());
  });
});

function moveBy(offsetLat: number, offsetLng: number) {
  const pos = playerMarker.getLatLng();
  playerMarker.setLatLng(
    leaflet.latLng(pos.lat + offsetLat, pos.lng + offsetLng)
  );
  map.setView(playerMarker.getLatLng());
  clearMap();
}

function clearMap() {
  currentCaches.forEach((layer) => {
    map.removeLayer(layer);
  });
}

function updateMap(offsetLat: number, offsetLng: number) {
  moveBy(offsetLat, offsetLng);
  clearMap();
  drawLocalCaches();
}

const north = document.querySelector("#north")!;
north.addEventListener("click", () => {
  updateMap(TILE_DEGREES, 0);
});
const south = document.querySelector("#south")!;
south.addEventListener("click", () => {
  updateMap(TILE_DEGREES * -1, 0);
});

const east = document.querySelector("#east")!;
east.addEventListener("click", () => {
  updateMap(0, TILE_DEGREES);
});

const west = document.querySelector("#west")!;
west.addEventListener("click", () => {
  updateMap(0, TILE_DEGREES * -1);
});

const reset = document.querySelector("#reset")!;
reset.addEventListener("click", () => {
  const pos = MERRILL_CLASSROOM;
  playerMarker.setLatLng(leaflet.latLng(pos.lat, pos.lng - TILE_DEGREES));
  map.setView(playerMarker.getLatLng());
  drawLocalCaches();
});

const playerInventory: Coin[] = [];
const currentCaches: leaflet.Layer[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";
let serial = 0;
const knownCaches = new Map<string, leaflet.Layer>();

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

function makePit(i: number, j: number) {
  const bounds = board.getCellBounds({ i: i, j: j });
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  let value = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
  const cacheWallet: Coin[] = [];

  for (let k = 0; k < value; k++) {
    cacheWallet.push(new Coin(i, j, (serial + 1).toString()));
    serial++;
  }

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has  <span id="value">${cacheWallet.length}</span> coins.</div>
                <button class="uiButt" id="col">collect  </button> <button class="uiButt" id="dep">deposit  </button>`;
    const collect = container.querySelector<HTMLButtonElement>("#col")!;

    collect.addEventListener("click", () => {
      if (cacheWallet.length > 0) {
        const takenCoin = cacheWallet[0];
        playerInventory.push(takenCoin);
        cacheWallet.splice(0, 1);
        value = cacheWallet.length;
        console.log("collect");
        console.log("cache", cacheWallet);
        console.log("player", playerInventory);
      }

      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      statusPanel.innerHTML = `${playerInventory.length} points accumulated`;
    });
    const deposit = container.querySelector<HTMLButtonElement>("#dep")!;
    deposit.addEventListener("click", () => {
      if (playerInventory.length > 0) {
        cacheWallet.push(playerInventory[0]);
        playerInventory.splice(0, 1);
        value = cacheWallet.length;
        console.log("dep");
        console.log("cache", cacheWallet);
        console.log("player", playerInventory);
      }
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      statusPanel.innerHTML = `${playerInventory.length} points accumulated`;
    });
    return container;
  });

  currentCaches.push(pit);
  knownCaches.set(`${i},${j}`, pit);
  pit.addTo(map);
}
drawLocalCaches();

function drawLocalCaches() {
  const playerLocation = playerMarker.getLatLng();
  board.getCellsNearPoint(playerLocation).forEach((cell) => {
    if (
      luck([cell.i, cell.j].toString()) < PIT_SPAWN_PROBABILITY &&
      !knownCaches.has(`${cell.i},${cell.j}`)
    ) {
      makePit(cell.i, cell.j);
    }
    if (knownCaches.has(`${cell.i},${cell.j}`)) {
      knownCaches.get(`${cell.i},${cell.j}`)?.addTo(map);
    }
  });
}
