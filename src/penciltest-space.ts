interface Point { x: number; y: number; }

interface Vector extends Point { velocity?: Point; }

interface Bounds {
  x?: number;
  y?: number; 
  width?: number;
  height?: number;
  aspect?: number;
  aspectRatio?: string;
}

interface Arc {
  center:Point;
  radius:number;
  start?:number;
  end?:number;
  resolution?:number;
};

class PTSpace {

  static zeroPoint:Point = {x:0, y:0};

  static defaultArc:Arc = {
    center: {x:0,y:0},
    radius: 10,
    start: 0,
    end: 1,
    resolution: 100,
  };

  static toPoint(coords:any) {
    if ("width" in coords) {
      return PTSpace.boundsCenter(coords as Bounds);
    }
    return {
      x: coords.x || 0,
      y: coords.y || 0
    };
  }

  static averagePoints(points: Array<Point>): Point {
    const sumPoints:Point = PTSpace.zeroPoint;
    for (let point of points) {
      sumPoints.x += point.x;
      sumPoints.y += point.y;
    }

    sumPoints.x /= points.length;
    sumPoints.y /= points.length;

    return sumPoints;
  };

  static scalePoint(point: Point, factor: number): Point {
    return {
      x: point.x * factor,
      y: point.y * factor
    }
  };

  static magnitude(point: Point): number {
    return Math.sqrt(point.x * point.x + point.y + point.y);
  };

  static unionBounds(points:Array<Point | Bounds>, bounds:Bounds = {}): Bounds {
    if (points.length === 0) { return bounds; }

    points.forEach((point) => {
      if (!("x" in bounds)) {
        bounds.x = point.x;
        bounds.width = 0; // Ignoring if bounds had width without x.
      } else if (point.x < bounds.x) {
        bounds.x = point.x;
      } else if (point.x > bounds.x + bounds.width) {
        bounds.width = point.x - bounds.x;
      } else if ("width" in point && point.x + point.width > bounds.x + bounds.width) {
        bounds.width = point.x + point.width - bounds.x;
      }

      if (!("y" in bounds)) {
        bounds.y = point.y;
        bounds.height = 0; // Ignoring if bounds had height without y.
      } else if (point.y < bounds.y) {
        bounds.y = point.y;
      } else if (point.y > bounds.y + bounds.height) {
        bounds.height = point.y - bounds.y;
      } else if ("height" in point && point.y + point.height > bounds.y + bounds.height) {
        bounds.height = point.y + point.height - bounds.y;
      }
    });

    return bounds;
  }

  static boundsCenter(bounds:Bounds): Point {
    const positionBounds = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      ...bounds
    };

    return {
      x:positionBounds.x + positionBounds.width / 2,
      y:positionBounds.y + positionBounds.height / 2
    };
  }

  static lerp(a:Point, b:Point, weight:number = 0.5): Point {
    return {
      x: a.x + (b.x - a.x) * weight,
      y: a.y + (b.y - a.y) * weight
    };
  }

  static boundsAroundPoint(point:Point, radiusX:number, radiusY:number = NaN): Bounds {
    if (isNaN(radiusY)) {
      radiusY = radiusX;
    }
    return {
      x: point.x - radiusX,
      y: point.y - radiusY,
      width: radiusX * 2,
      height: radiusY * 2,
    };
  }

  static sumPoints(point1:Point, point2:Point): Point {
    return {
      x: point1.x + point2.x,
      y: point1.y + point2.y
    };
  };

  static diffPoints(point1:Point, point2:Point): Point {
    return {
      x: point1.x - point2.x,
      y: point1.y - point2.y
    };
  };

  static negatePoint(point:Point): Point {
    return {
      x: -point.x,
      y: -point.y
    };
  };

}

