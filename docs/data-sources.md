# Data Sources And Licensing

The running prototype uses generated synthetic scenery and does not download third-party tiles. This keeps the first vertical slice reliable offline and avoids unclear cache rights.

Planned data sources:

- **JSBSim** for flight dynamics. JSBSim is LGPL; keep it isolated, publish modifications, and include source availability before distribution.
- **CesiumJS** for browser geospatial rendering. CesiumJS is Apache 2.0. Cesium ion content has separate token, quota, attribution, and caching terms.
- **OurAirports** for airport/runway data. It is CC-BY 4.0 and requires attribution.
- **OpenStreetMap-derived data** for buildings/roads where terms permit. OSM attribution and ODbL obligations must be honored.
- **METAR/TAF providers** for weather. Provider terms determine whether a proxy, cache, or attribution UI is required.

No third-party imagery or terrain tiles should be cached for offline use unless the provider terms explicitly allow it. Offline scenery packs should be generated from clearly licensed DEM/vector data or synthetic tooling.
