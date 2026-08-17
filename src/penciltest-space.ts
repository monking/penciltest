interface Point { x: number; y: number; }

interface Vector extends Point { velocity?: Point; }

type Path = Array<Point>;

interface Rect {
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

interface Circle extends Arc {}; // Identity with Arc, but a distinct name to clarify expectation no gap between start and end (end === start + 1).

class PtSpace {

  static zeroPoint:Point = {x:0, y:0};

  static defaultArc:Arc = {
    center: PtSpace.zeroPoint,
    radius: 10,
    start: 0,
    end: 1,
    resolution: 24,
  };

  static boundsAroundPoint(point:Point, radiusX:number, radiusY:number = NaN): Rect {
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

  static rectCenter(bounds:Rect): Point {
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

  static unionBounds(points:Array<Point | Rect>, bounds:Rect = {}): Rect {
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

  static arcPoint(arc:Arc, angle:number) {
    return {
      x: Math.cos(Math.PI * 2 * angle) * arc.radius,
      y: Math.sin(Math.PI * 2 * angle) * arc.radius,
    };
  }

  static traceArc(config:Arc): Array<Point> {
    const arc = { ...PtSpace.defaultArc, ...config };
    const points:Array<Point> = [];
    const arcStep = (arc.start < arc.end ? 1 : -1)/arc.resolution;
    let angle = arc.start;
    while (angle <= arc.end) {
      if (angle > arc.end) { angle = arc.end; }
      points.push(PtSpace.sumPoints(PtSpace.arcPoint(arc, angle), config.center));
      if (angle === arc.end) {
        break;
      }
      angle += arcStep;
      if (angle > arc.end) {
        angle = arc.end;
      }
    }
    return points;
  }

  static toPoint(coords:any) {
    if ("width" in coords) {
      return PtSpace.rectCenter(coords as Rect);
    }
    return {
      x: coords.x || 0,
      y: coords.y || 0
    };
  }

  static averagePoints(points: Array<Point>): Point {
    const sumPoints:Point = PtSpace.zeroPoint;
    for (let point of points) {
      sumPoints.x += point.x;
      sumPoints.y += point.y;
    }

    sumPoints.x /= points.length;
    sumPoints.y /= points.length;

    return sumPoints;
  };

  static scalePoint(point: Point, factor: number): Point {
    const scaledPoint:Point = {
      ...point, // for overloaded types like Mark
      x: point.x * factor,
      y: point.y * factor
    };
    return scaledPoint;
  };

  static scalePath(path:Path, factor:number): Path {
    return path.map((p) => PtSpace.scalePoint(p, factor));
  }

  static scaleStroke(stroke:Stroke, factor:number): Stroke {
    const scaledStroke = {
      ...stroke,
      path: stroke.path.map((mark) => PtSpace.scalePoint(mark as Point, factor) as Mark),
    };
    if ("width" in scaledStroke) {
      scaledStroke.width *= factor;
    }
    return scaledStroke;
  }

  static magnitude(point: Point): number {
    return Math.sqrt(point.x * point.x + point.y * point.y);
  };

  static doesPathIntersect(path:Path, area:Rect | Circle): boolean {
    const isCircle = "radius" in area;
    const radiusX = isCircle ? area.radius : area.width / 2;
    const radiusY = isCircle ? area.radius : area.height / 2;
    const center = isCircle ? area.center : {x: area.x + radiusX, y: area.y + radiusY};
    const subdivisionLength = Math.max(radiusX, radiusY, 0.5) * 1.9; // A little less than the diameter, to make it more likely to intersect an edge of the area. Throwing in a non-zero literal, just in case.

    // TODO Test LINE segment intersection with area. #77af0b21-5b34-4831-b6e9-946de3146597
    // WORKAROUND(31e33644-5677-4cf7-ba3f-660befeb662c): Simulate midpoints along the line.
    // Performance is not terrible, even when the radius approaches 1.
    // Slowdown occurs around (with a radius of 5px on an 8-core Intel i7, 1.2GHz-3GHz):
    // * 10k points on eco (1.2GHz × 8)
    // * 30k points on performance (3.0 GHz × 8)
    //
    // Larger test area has better performance (as fewer midpoints are made).

    let lastPoint, midpoint, midpointStep = 1/2;
    for (let point of path) {
      midpointStep = lastPoint
        ? subdivisionLength / PtSpace.magnitude(PtSpace.diffPoints(point, lastPoint))
        : 1;
      for (let midPosition = 0; midPosition < 1; midPosition += midpointStep) {
        midpoint = midPosition === 0 || !lastPoint
          ? point
          : PtSpace.lerpPoint(point, lastPoint, midPosition); // Lerping backward*
        // * Somewhat counterintuitively, I'm making midpoints BACK from the
        //   current point. This is to serve a simpler intuition that we're
        //   testing THIS point NOW, rather than waiting for the next
        //   iteration.
        if (Math.abs(center.x - midpoint.x) < radiusX && Math.abs(center.y - midpoint.y) < radiusY) {
          if (isCircle && PtSpace.magnitude(PtSpace.diffPoints(center, midpoint)) > radiusX) {
            continue;
          }
          return true;
        }
      }
      lastPoint = point;
    }

    return false;
  }

  static getIntersectingRect(...areas:Array<Rect>): Rect | null {
    const intersection = areas.reduce((acc, area, i) => {
      if (i === 0) {
        return area;
      } else if (acc === null) {
        return acc;
      }

      const right = Math.min(acc.x + acc.width, area.x + area.width);
      const bottom = Math.min(acc.y + acc.height, area.y + area.height);
      const top = Math.max(acc.y, area.y);
      const left = Math.max(acc.x, area.x);

      if (bottom < top || right < left) {
        return null;
      }

      return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };
    }, null);
    return intersection;
  }

  static expandRect(rect:Rect, radius:number): Rect {
    return {
      ...rect,
      x: (rect.x || 0) - radius,
      y: (rect.y || 0) - radius,
      width: rect.width + radius * 2,
      height: rect.height + radius * 2,
    };
  }

  static lerpPoint(a:Point, b:Point, weight:number = 0.5): Point {
    return {
      x: Utils.lerp(a.x, b.x, weight),
      y: Utils.lerp(a.y, b.y, weight)
    };
  }

  static sumPoints(...points:Array<Point>): Point {
    return points.reduce((sum, point) => {
      return {
        x: sum.x + point.x,
        y: sum.y + point.y
      };
    }, PtSpace.zeroPoint);
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

  static chain

}

