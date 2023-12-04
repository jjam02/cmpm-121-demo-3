import leaflet from "leaflet";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { i, j });
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const lat = Math.floor(point.lat / this.tileWidth);
    const longe = Math.floor(point.lng / this.tileWidth);
    return this.getCanonicalCell({ i: lat, j: longe });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const canonCell = this.getCanonicalCell(cell);
    return leaflet.latLngBounds([
      [canonCell.i * this.tileWidth, canonCell.j * this.tileWidth],
      [(canonCell.i + 1) * this.tileWidth, (canonCell.j + 1) * this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let i = originCell.i - this.tileVisibilityRadius;
      i < originCell.i + this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = originCell.i - this.tileVisibilityRadius;
        j < originCell.j + this.tileVisibilityRadius;
        j++
      ) {
        resultCells.push(this.getCanonicalCell({ i, j }));
      }
    }
    return resultCells;
  }
}
