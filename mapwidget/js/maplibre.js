function render({ model, el }) {
    // Inject CSS if not already loaded
    if (!document.getElementById("maplibre-css")) {
        const link = document.createElement("link");
        link.id = "maplibre-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.css";
        document.head.appendChild(link);
    }

    // Inject mapbox-gl-draw CSS if not already loaded
    if (!document.getElementById("mapbox-gl-draw-css")) {
        const link = document.createElement("link");
        link.id = "mapbox-gl-draw-css";
        link.rel = "stylesheet";
        link.href = "https://www.unpkg.com/@mapbox/mapbox-gl-draw@1.5.0/dist/mapbox-gl-draw.css";
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

    // Function to load MapboxDraw if not available
    function loadMapboxDraw(callback) {
        if (typeof MapboxDraw !== "undefined") {
            callback();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://www.unpkg.com/@mapbox/mapbox-gl-draw@1.5.0/dist/mapbox-gl-draw.js";
        script.onload = () => {
            // Patch MapboxDraw constants immediately after loading
            if (MapboxDraw.constants && MapboxDraw.constants.classes) {
                MapboxDraw.constants.classes.CANVAS = 'maplibregl-canvas';
                MapboxDraw.constants.classes.CONTROL_BASE = 'maplibregl-ctrl';
                MapboxDraw.constants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-';
                MapboxDraw.constants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group';
                MapboxDraw.constants.classes.ATTRIBUTION = 'maplibregl-ctrl-attrib';
            }
            callback();
        };
        script.onerror = () => {
            console.error("Failed to load MapboxDraw library");
        };
        document.body.appendChild(script);
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

        // Initialize draw features in model
        model.set("draw_features_selected", []);
        model.set("draw_feature_collection_all", { type: "FeatureCollection", features: [] });
        model.set("draw_features_created", []);
        model.set("draw_features_updated", []);
        model.set("draw_features_deleted", []);

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
            map.getCanvas().style.cursor = 'pointer';
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
                } else if (method === "addDrawControl") {
                    // Handle addDrawControl specially
                    const [options, controls, position, geojson] = args;
                    addDrawControlToMap(map, options, controls, position, geojson);
                } else if (method === "removeDrawControl") {
                    // Handle removeDrawControl specially
                    removeDrawControlFromMap(map);
                } else if (method === "drawFeaturesDeleteAll") {
                    // Handle delete all draw features
                    deleteAllDrawFeatures(map);
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

        // Function to add draw control to the map
        function addDrawControlToMap(map, options = {}, controls = {}, position = "top-right", geojson = null) {
            // Check if MapboxDraw is available
            if (typeof MapboxDraw === "undefined") {
                console.warn("MapboxDraw is not loaded. Loading now...");
                loadMapboxDraw(() => addDrawControlToMap(map, options, controls, position, geojson));
                return;
            }

            // Patch MapboxDraw constants to work with MapLibre GL
            if (MapboxDraw.constants && MapboxDraw.constants.classes) {
                MapboxDraw.constants.classes.CANVAS = 'maplibregl-canvas';
                MapboxDraw.constants.classes.CONTROL_BASE = 'maplibregl-ctrl';
                MapboxDraw.constants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-';
                MapboxDraw.constants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group';
                MapboxDraw.constants.classes.ATTRIBUTION = 'maplibregl-ctrl-attrib';
            }

            // Default controls configuration
            const defaultControls = {
                polygon: true,
                line_string: true,
                point: true,
                trash: true,
                combine_features: false,
                uncombine_features: false
            };

            // Merge provided controls with defaults
            const drawControls = { ...defaultControls, ...controls };

            // Default options
            const defaultOptions = {
                displayControlsDefault: false,
                controls: {
                    polygon: drawControls.polygon,
                    line_string: drawControls.line_string,
                    point: drawControls.point,
                    trash: drawControls.trash,
                    combine_features: drawControls.combine_features,
                    uncombine_features: drawControls.uncombine_features
                }
            };

            // Merge provided options with defaults
            const drawOptions = { ...defaultOptions, ...options };

            // Create draw control
            const draw = new MapboxDraw(drawOptions);

            try {
                // For better control positioning, don't specify position if it's default
                if (position === "top-right") {
                    map.addControl(draw);
                } else {
                    map.addControl(draw, position);
                }
                console.log(`Added draw control at ${position}`);
                controlRegistry.set("draw", draw);

                // Add initial geojson if provided
                if (geojson) {
                    if (geojson.type === "FeatureCollection") {
                        geojson.features.forEach(feature => {
                            draw.add(feature);
                        });
                    } else if (geojson.type === "Feature") {
                        draw.add(geojson);
                    }
                    updateDrawFeatures(map, draw);
                }

                // Set up draw event handlers
                setupDrawEventHandlers(map, draw);

            } catch (err) {
                console.warn("Failed to add draw control:", err);
            }
        }

        // Function to set up draw event handlers
        function setupDrawEventHandlers(map, draw) {
            map.on('draw.create', function (e) {
                console.log('Features created:', e.features);
                model.set("draw_features_created", e.features);
                updateDrawFeatures(map, draw);
                model.save_changes();
            });

            map.on('draw.update', function (e) {
                console.log('Features updated:', e.features);
                model.set("draw_features_updated", e.features);
                updateDrawFeatures(map, draw);
                model.save_changes();
            });

            map.on('draw.delete', function (e) {
                console.log('Features deleted:', e.features);
                model.set("draw_features_deleted", e.features);
                updateDrawFeatures(map, draw);
                model.save_changes();
            });

            map.on('draw.selectionchange', function (e) {
                console.log('Selection changed:', e.features);
                model.set("draw_features_selected", e.features);
                model.save_changes();
            });
        }

        // Function to update all draw features in model
        function updateDrawFeatures(map, draw) {
            const allFeatures = draw.getAll();
            model.set("draw_feature_collection_all", allFeatures);
        }

        // Function to remove draw control from the map
        function removeDrawControlFromMap(map) {
            const draw = controlRegistry.get("draw");
            if (draw) {
                map.removeControl(draw);
                console.log("Removed draw control");
                controlRegistry.delete("draw");

                // Clear draw features from model
                model.set("draw_features_selected", []);
                model.set("draw_feature_collection_all", { type: "FeatureCollection", features: [] });
                model.set("draw_features_created", []);
                model.set("draw_features_updated", []);
                model.set("draw_features_deleted", []);
                model.save_changes();
            } else {
                console.warn("Draw control not found");
            }
        }

        // Function to delete all draw features
        function deleteAllDrawFeatures(map) {
            const draw = controlRegistry.get("draw");
            if (draw) {
                const allFeatures = draw.getAll();
                if (allFeatures.features.length > 0) {
                    const featureIds = allFeatures.features.map(f => f.id);
                    draw.delete(featureIds);
                    console.log("Deleted all draw features");

                    // Update model
                    model.set("draw_features_deleted", allFeatures.features);
                    updateDrawFeatures(map, draw);
                    model.save_changes();
                }
            } else {
                console.warn("Draw control not found");
            }
        }


        // Resize after layout stabilizes
        setTimeout(() => map.resize(), 100);
    }

    // Preload MapboxDraw before map initialization
    function preloadMapboxDraw() {
        if (typeof MapboxDraw === "undefined") {
            loadMapboxDraw(() => {
                console.log("MapboxDraw preloaded and ready");
            });
        }
    }

    if (typeof maplibregl === "undefined") {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.js";
        script.onload = () => {
            preloadMapboxDraw();
            initMap();
        };
        document.body.appendChild(script);
    } else {
        preloadMapboxDraw();
        initMap();
    }
}

export default { render };
