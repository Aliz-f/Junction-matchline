/**
 * England outline for the stadium map (FE-05).
 *
 * Derived from Natural Earth 1:50m `admin_0_map_subunits`, which is in the
 * **public domain** (naturalearthdata.com terms: "no permission needed"), so no
 * attribution or tile-usage policy applies. Simplified with Douglas-Peucker at
 * ~0.012 degrees: enough coastline to be recognisably England, small enough to
 * inline.
 *
 * Generated, not hand-drawn: the geography is real, which matters because the
 * venue markers are positioned with the same projection used to build it.
 * Regenerate with `scripts/build_england.py` rather than editing by hand.
 *
 * Projection is Web Mercator, normalised so the outline fills
 * `0..1000` horizontally.
 */

/** The SVG viewBox this path set is authored against. */
export const ENGLAND_VIEWBOX = { width: 1000, height: 1298.8 } as const;

/** Mercator bounds used to build the paths, for projecting coordinates onto them. */
export const ENGLAND_PROJECTION = {
  minX: -5.656250,
  maxY: 67.555828,
  scale: 135.083438,
} as const;

/** Mainland first, then islands large enough to read at this size. */
export const ENGLAND_PATHS: readonly string[] = [
  "M403.7,956.3 L402.4,926.6 L404.4,917.2 L381.1,894.6 L365.1,892.6 L350.0,873.8 L344.4,859.7 L346.1,833.4 L362.2,814.0 L362.1,804.3 L340.5,789.9 L330.3,776.9 L338.0,767.9 L357.9,759.9 L360.8,754.1 L359.2,750.3 L345.1,750.9 L343.3,747.1 L360.3,715.8 L360.6,709.3 L339.4,695.5 L338.5,691.2 L343.3,680.8 L353.4,667.3 L361.4,662.8 L392.0,671.7 L396.6,668.1 L395.9,663.1 L381.7,651.4 L368.6,624.1 L366.7,619.2 L369.1,610.1 L362.0,602.0 L345.6,593.4 L336.4,563.0 L350.1,555.7 L369.8,583.2 L377.2,586.1 L392.7,582.1 L370.6,573.0 L362.9,564.2 L350.1,536.2 L350.8,519.5 L368.9,486.1 L354.5,476.8 L352.7,460.7 L355.2,446.5 L372.3,433.9 L379.6,393.7 L376.7,384.0 L359.7,385.6 L344.0,395.8 L336.4,395.4 L315.4,372.1 L281.9,316.8 L278.8,294.3 L296.1,245.5 L322.6,214.2 L353.9,203.3 L347.9,201.2 L353.5,188.7 L402.5,145.3 L420.4,117.3 L466.5,86.7 L467.7,82.3 L450.5,43.2 L491.6,0.0 L540.5,56.9 L546.6,74.2 L571.9,186.0 L589.6,245.3 L597.6,261.8 L608.1,273.3 L673.4,308.4 L714.0,360.5 L752.7,397.7 L743.0,406.3 L736.3,419.9 L741.3,438.3 L779.6,514.2 L768.9,507.1 L754.1,506.4 L727.6,485.2 L701.7,489.9 L674.9,488.1 L698.5,494.8 L724.4,495.3 L781.4,546.3 L800.7,576.4 L812.1,616.0 L804.3,633.8 L770.3,673.1 L801.9,694.8 L815.7,691.1 L839.5,659.4 L859.2,657.1 L906.7,661.2 L935.8,668.9 L950.8,675.9 L987.9,707.1 L995.9,724.2 L999.6,746.1 L1000.0,770.4 L986.6,812.6 L979.0,847.6 L955.0,875.0 L941.9,883.3 L930.5,880.2 L929.9,885.0 L936.1,895.3 L936.2,907.8 L912.8,920.9 L893.1,916.0 L865.7,933.0 L885.4,941.8 L889.3,951.1 L884.4,967.5 L872.0,974.8 L832.6,982.8 L821.4,990.4 L835.4,986.4 L845.2,989.9 L851.3,1003.7 L856.8,1007.6 L884.2,1013.4 L933.9,1010.1 L955.2,1012.6 L952.9,1051.7 L948.5,1057.5 L905.2,1080.7 L893.8,1106.8 L868.4,1105.1 L856.5,1115.4 L791.8,1141.6 L736.5,1130.7 L703.2,1131.6 L658.0,1141.1 L572.7,1113.0 L583.8,1129.3 L559.2,1145.0 L547.8,1148.1 L512.0,1151.8 L489.7,1149.7 L499.0,1170.5 L489.1,1175.7 L446.6,1168.4 L440.6,1169.8 L435.3,1176.6 L419.9,1172.9 L388.9,1153.9 L358.9,1151.5 L304.2,1169.5 L293.2,1187.5 L279.9,1235.4 L267.0,1252.7 L251.6,1255.0 L237.2,1243.0 L197.4,1220.3 L183.6,1227.5 L155.3,1231.3 L125.4,1242.0 L87.4,1269.4 L72.6,1295.2 L58.2,1298.8 L45.0,1285.8 L30.0,1281.3 L4.6,1292.6 L0.1,1287.0 L0.0,1275.5 L11.6,1261.8 L42.4,1251.4 L69.5,1224.4 L88.0,1198.7 L103.0,1190.5 L107.4,1180.2 L145.0,1138.8 L153.1,1095.7 L183.7,1085.1 L198.3,1050.3 L245.0,1041.2 L276.7,1041.7 L308.1,1048.5 L340.4,1046.8 L353.1,1037.4 L374.9,1003.4 L435.4,930.6 L403.7,956.3 Z",
];

/**
 * Projects a WGS84 coordinate into the outline's SVG space.
 *
 * Uses the same Web Mercator transform the paths were generated with, so a
 * verified venue coordinate lands where it actually is.
 */
export function projectToEngland(lat: number, lng: number): { x: number; y: number } {
  const mercY = (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
  return {
    x: (lng - ENGLAND_PROJECTION.minX) * ENGLAND_PROJECTION.scale,
    y: (ENGLAND_PROJECTION.maxY - mercY) * ENGLAND_PROJECTION.scale,
  };
}
