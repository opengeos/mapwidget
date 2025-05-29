function render({ model, el }) {
    // Inject CSS if not already loaded
    if (!document.getElementById("maplibre-css")) {
        const link = document.createElement("link");
        link.id = "maplibre-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.css";
        document.head.appendChild(link);
    }

    function updateModel(model, map) {
        const viewState = {
            center: map.getCenter(),
            zoom: map.getZoom(),
            bounds: map.getBounds(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
        };
        model.set("view_state", viewState);
        model.save_changes();
    }

    // Load UMD JS if not already loaded
    function initMap() {
        el.innerHTML = "";
        el.style.position = "relative";
        el.style.width = model.get("width") || "100%";
        el.style.height = model.get("height") || "600px";

        const div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        el.appendChild(div);

        const center = model.get("center");
        const zoom = model.get("zoom");
        const bearing = model.get("bearing");
        const pitch = model.get("pitch");
        const style = model.get("style");

        const map = new maplibregl.Map({
            container: div,
            style: style,
            center: center,
            zoom: zoom,
            bearing: bearing,
            pitch: pitch,
        });

        // Registry to track added controls for removal
        const controlRegistry = new Map();
        let processedCallsCount = 0;

        map.on("click", function (e) {
            model.set("clicked_latlng", [e.lngLat.lng, e.lngLat.lat]);
            model.save_changes();
        });

        map.on("moveend", function () {
            const c = map.getCenter();
            const bbox = map.getBounds();
            model.set("center", [c.lng, c.lat]);
            model.set("bounds", [
                bbox.getWest(),
                bbox.getSouth(),
                bbox.getEast(),
                bbox.getNorth(),
            ]);
            updateModel(model, map);
            model.save_changes();
        });

        map.on("zoomend", function () {
            const c = map.getCenter();
            const bbox = map.getBounds();
            model.set("center", [c.lng, c.lat]);
            model.set("zoom", map.getZoom());
            model.set("bounds", [
                bbox.getWest(),
                bbox.getSouth(),
                bbox.getEast(),
                bbox.getNorth(),
            ]);
            updateModel(model, map);
            model.save_changes();
        });

        map.on("styledata", () => {
            // console.log("Style or layer change detected");
            model.set("root", map.getStyle());
            model.save_changes();
        });

        map.on("sourcedata", (e) => {
            // console.log("Source data updated:", e);
            model.set("sources", map.getStyle().sources);
            model.save_changes();
        });

        map.on("load", () => {
            console.log("Map loaded");
            model.set("loaded", true);
            model.save_changes();
        });

        // Support JS calls from Python
        model.on("change:calls", () => {
            const calls = model.get("calls") || [];
            
            // Only process new calls that haven't been processed yet
            const newCalls = calls.slice(processedCallsCount);
            
            newCalls.forEach(({ method, args }, index) => {
                const callIndex = processedCallsCount + index;
                console.log(
                    `Calling map.${method} with args:`, args
                );
                if (method === "addControl") {
                    // Handle addControl specially
                    const [controlType, position, options] = args;
                    addControlToMap(map, controlType, position, options);
                } else if (method === "removeControl") {
                    // Handle removeControl specially
                    const [controlType] = args;
                    removeControlFromMap(map, controlType);
                } else if (typeof map[method] === "function") {
                    try {
                        map[method](...(args || []));
                    } catch (err) {
                        console.warn(`map.${method} failed`, err);
                    }
                } else {
                    console.warn(`map.${method} is not a function`);
                }
            });
            
            // Update the count of processed calls
            processedCallsCount = calls.length;
        });

        // Function to add controls to the map
        function addControlToMap(map, controlType, position = "top-right", options = {}) {
            let control;
            
            // Normalize control type
            const type = controlType.toLowerCase().replace("control", "");
            
            switch (type) {
                case "navigation":
                    control = new maplibregl.NavigationControl(options);
                    break;
                case "geolocate":
                    control = new maplibregl.GeolocateControl(options);
                    break;
                case "scale":
                    control = new maplibregl.ScaleControl(options);
                    break;
                case "fullscreen":
                    control = new maplibregl.FullscreenControl(options);
                    break;
                case "attribution":
                    control = new maplibregl.AttributionControl(options);
                    break;
                case "globe":
                    control = new maplibregl.GlobeControl(options);
                    break;
                case "logo":
                    control = new maplibregl.LogoControl(options);
                    break;
                case "terrain":
                    control = new maplibregl.TerrainControl(options);
                    break;
                default:
                    console.warn(`Unknown control type: ${controlType}`);
                    return;
            }
            
            try {
                map.addControl(control, position);
                console.log(`Added ${controlType} control at ${position}`);
                controlRegistry.set(controlType, control);
            } catch (err) {
                console.warn(`Failed to add ${controlType} control:`, err);
            }
        }

        // Function to remove control from the map
        function removeControlFromMap(map, controlType) {
            const control = controlRegistry.get(controlType);
            if (control) {
                map.removeControl(control);
                console.log(`Removed control with type: ${controlType}`);
                controlRegistry.delete(controlType);
            } else {
                console.warn(`Control with type: ${controlType} not found`);
            }
        }

        // Resize after layout stabilizes
        setTimeout(() => map.resize(), 100);
    }

    if (typeof maplibregl === "undefined") {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.js";
        script.onload = initMap;
        document.body.appendChild(script);
    } else {
        initMap();
    }
}

export default { render };
