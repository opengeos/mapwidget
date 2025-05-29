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

    // Function to load MapboxDraw if not available
    function loadMapboxDraw(callback) {
        if (typeof MapboxDraw !== "undefined") {
            callback();
            return;
        }

        // Inject mapbox-gl-draw CSS if not already loaded
        if (!document.getElementById("mapbox-gl-draw-css")) {
            const link = document.createElement("link");
            link.id = "mapbox-gl-draw-css";
            link.rel = "stylesheet";
            link.href =
                "https://www.unpkg.com/@mapbox/mapbox-gl-draw@1.5.0/dist/mapbox-gl-draw.css";
            document.head.appendChild(link);
        }

        const script = document.createElement("script");
        script.src =
            "https://www.unpkg.com/@mapbox/mapbox-gl-draw@1.5.0/dist/mapbox-gl-draw.js";
        script.onload = () => {
            // Patch MapboxDraw constants immediately after loading
            if (MapboxDraw.constants && MapboxDraw.constants.classes) {
                MapboxDraw.constants.classes.CANVAS = "maplibregl-canvas";
                MapboxDraw.constants.classes.CONTROL_BASE = "maplibregl-ctrl";
                MapboxDraw.constants.classes.CONTROL_PREFIX =
                    "maplibregl-ctrl-";
                MapboxDraw.constants.classes.CONTROL_GROUP =
                    "maplibregl-ctrl-group";
                MapboxDraw.constants.classes.ATTRIBUTION =
                    "maplibregl-ctrl-attrib";
            }
            callback();
        };
        script.onerror = () => {
            console.error("Failed to load MapboxDraw library");
            callback(); // Still call callback to prevent hanging
        };
        document.body.appendChild(script);
    }

    // Function to load MapboxLegend if not available
    function loadMapboxLegend(callback) {
        if (typeof MapboxLegendControl !== "undefined") {
            callback();
            return;
        }

        // Inject mapbox-gl-legend CSS if not already loaded
        if (!document.getElementById("mapbox-gl-legend-css")) {
            const link = document.createElement("link");
            link.id = "mapbox-gl-legend-css";
            link.rel = "stylesheet";
            link.href =
                "https://watergis.github.io/mapbox-gl-legend/mapbox-gl-legend.css";
            document.head.appendChild(link);
        }

        const script = document.createElement("script");
        script.src =
            "https://watergis.github.io/mapbox-gl-legend/mapbox-gl-legend.js";
        script.onload = () => {
            callback();
        };
        script.onerror = () => {
            console.error("Failed to load MapboxLegend library");
            callback(); // Still call callback to prevent hanging
        };
        document.body.appendChild(script);
    }

    // Function to load MapLibre GL Opacity if not available
    function loadMaplibreOpacity(callback) {
        if (typeof OpacityControl !== "undefined") {
            callback();
            return;
        }

        // Inject maplibre-gl-opacity CSS if not already loaded
        if (!document.getElementById("maplibre-gl-opacity-css")) {
            const link = document.createElement("link");
            link.id = "maplibre-gl-opacity-css";
            link.rel = "stylesheet";
            link.href =
                "https://www.unpkg.com/maplibre-gl-opacity@1.8.0/build/maplibre-gl-opacity.css";
            document.head.appendChild(link);
        }

        const script = document.createElement("script");
        script.src =
            "https://www.unpkg.com/maplibre-gl-opacity@1.8.0/build/maplibre-gl-opacity.umd.js";
        script.onload = () => {
            callback();
        };
        script.onerror = () => {
            console.error("Failed to load MapLibre GL Opacity library");
            callback(); // Still call callback to prevent hanging
        };
        document.body.appendChild(script);
    }

    // Custom repeat modes for continuous drawing
    function createRepeatModes() {
        const RepeatPointMode = {};
        RepeatPointMode.onSetup = function () {
            return {};
        };
        RepeatPointMode.onClick = function (state, e) {
            const point = this.newFeature({
                type: "Feature",
                properties: {},
                geometry: {
                    type: "Point",
                    coordinates: [e.lngLat.lng, e.lngLat.lat],
                },
            });
            this.addFeature(point);
        };
        RepeatPointMode.onKeyUp = function (state, e) {
            if (e.keyCode === 27) {
                // Esc key
                model.set("draw_repeat_mode", false);
                model.save_changes();
                return this.changeMode("simple_select");
            }
        };
        RepeatPointMode.toDisplayFeatures = function (state, geojson, display) {
            display(geojson);
        };

        const RepeatLineMode = {
            onSetup: function() {
                const line = this.newFeature({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                });
                this.addFeature(line);
                this.clearSelectedFeatures();
                this.updateUIClasses({ mouse: 'add' });
                this.activateUIButton('line');
                this.setActionableState({ trash: true });
                return {
                    line,
                    currentVertexPosition: 0
                };
            },
            onClick: function(state, e) {
                const coords = state.line.coordinates;
                if (coords.length >= 2 && e.originalEvent.detail === 2) {
                    // Double-click: finish line
                    if (state.line.isValid()) {
                        this.addFeature(state.line);
                    }
                    this.changeMode('repeat_line');
                    return;
                }

                state.line.updateCoordinate(`${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat);
                state.currentVertexPosition++;
                state.line.updateCoordinate(`${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat);
            },
            onKeyUp: function(state, e) {
                if (e.keyCode === 27) {
                    model.set("draw_repeat_mode", false);
                    model.save_changes();
                    return this.changeMode('simple_select');
                }
            },
            onMouseMove: function(state, e) {
                state.line.updateCoordinate(`${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat);
            },
            toDisplayFeatures: function(state, geojson, display) {
                display(geojson);
            }
        };

        const RepeatPolygonMode = {
            onSetup: function() {
                const polygon = this.newFeature({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[]]
                    }
                });
                this.addFeature(polygon);
                this.clearSelectedFeatures();
                this.updateUIClasses({ mouse: 'add' });
                this.activateUIButton('polygon');
                this.setActionableState({ trash: true });
                return {
                    polygon,
                    currentVertexPosition: 0
                };
            },
            onClick: function(state, e) {
                const coords = state.polygon.coordinates[0];

                // Double-click to finish polygon
                if (coords.length >= 3 && e.originalEvent.detail === 2) {
                    if (state.polygon.isValid()) {
                        this.addFeature(state.polygon);
                    }
                    this.changeMode('repeat_polygon');
                    return;
                }

                const lng = e.lngLat.lng;
                const lat = e.lngLat.lat;
                const idx = state.currentVertexPosition;

                // First point: initialize second point for immediate feedback
                if (idx === 0) {
                    state.polygon.updateCoordinate(`0.${idx}`, lng, lat);
                    state.polygon.updateCoordinate(`0.${idx + 1}`, lng, lat); // duplicate
                    state.currentVertexPosition += 2;
                } else {
                    state.polygon.updateCoordinate(`0.${idx}`, lng, lat);
                    state.currentVertexPosition++;
                    state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, lng, lat);
                }
            }
            ,
            onKeyUp: function(state, e) {
                if (e.keyCode === 27) {
                    model.set("draw_repeat_mode", false);
                    model.save_changes();
                    return this.changeMode('simple_select');
                }
            },
            onMouseMove: function(state, e) {
                state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat);
            },
            toDisplayFeatures: function(state, geojson, display) {
                display(geojson);
            }
        };


        return {
            repeat_point: RepeatPointMode,
            repeat_line: RepeatLineMode,
            repeat_polygon: RepeatPolygonMode,
        };
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
        model.set("draw_feature_collection_all", {
            type: "FeatureCollection",
            features: [],
        });
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
            map.getCanvas().style.cursor = "pointer";
        });

        // Support JS calls from Python
        model.on("change:calls", () => {
            const calls = model.get("calls") || [];

            // Only process new calls that haven't been processed yet
            const newCalls = calls.slice(processedCallsCount);

            newCalls.forEach(({ method, args }, index) => {
                const callIndex = processedCallsCount + index;
                console.log(`Calling map.${method} with args:`, args);
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
                    addDrawControlToMap(
                        map,
                        options,
                        controls,
                        position,
                        geojson
                    );
                } else if (method === "removeDrawControl") {
                    // Handle removeDrawControl specially
                    removeDrawControlFromMap(map);
                } else if (method === "drawFeaturesDeleteAll") {
                    // Handle delete all draw features
                    deleteAllDrawFeatures(map);
                } else if (method === "addLegendControl") {
                    // Handle addLegendControl specially
                    const [targets, options, position] = args;
                    addLegendControlToMap(map, targets, options, position);
                } else if (method === "setDrawMode") {
                    const [mode] = args;
                    const draw = controlRegistry.get("draw");
                    if (draw && typeof draw.changeMode === "function") {
                        draw.changeMode(mode);
                    } else {
                        console.warn(
                            "Draw control not available or changeMode is not a function"
                        );
                    }
                } else if (method === "addOpacityControl") {
                    // Handle addOpacityControl specially
                    const [baseLayers, overLayers, options, position, defaultVisibility] = args;
                    addOpacityControlToMap(map, baseLayers, overLayers, options, position, defaultVisibility);
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
        function addControlToMap(
            map,
            controlType,
            position = "top-right",
            options = {}
        ) {
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
        function addDrawControlToMap(
            map,
            options = {},
            controls = {},
            position = "top-right",
            geojson = null
        ) {
            // Check if MapboxDraw is available
            if (typeof MapboxDraw === "undefined") {
                console.log("MapboxDraw is not loaded. Loading now...");
                loadMapboxDraw(() =>
                    addDrawControlToMap(
                        map,
                        options,
                        controls,
                        position,
                        geojson
                    )
                );
                return;
            }

            try {
                // Patch MapboxDraw constants to work with MapLibre GL
                if (MapboxDraw.constants && MapboxDraw.constants.classes) {
                    MapboxDraw.constants.classes.CANVAS = "maplibregl-canvas";
                    MapboxDraw.constants.classes.CONTROL_BASE =
                        "maplibregl-ctrl";
                    MapboxDraw.constants.classes.CONTROL_PREFIX =
                        "maplibregl-ctrl-";
                    MapboxDraw.constants.classes.CONTROL_GROUP =
                        "maplibregl-ctrl-group";
                    MapboxDraw.constants.classes.ATTRIBUTION =
                        "maplibregl-ctrl-attrib";
                }

                // Default controls configuration
                const defaultControls = {
                    polygon: true,
                    line_string: true,
                    point: true,
                    trash: true,
                    combine_features: false,
                    uncombine_features: false,
                };

                // Merge provided controls with defaults
                const drawControls = { ...defaultControls, ...controls };

                // Create custom repeat modes
                const customModes = createRepeatModes();

                // Default options with custom styles to fix validation issues
                const defaultOptions = {
                    displayControlsDefault: false,
                    controls: {
                        polygon: drawControls.polygon,
                        line_string: drawControls.line_string,
                        point: drawControls.point,
                        trash: drawControls.trash,
                        combine_features: drawControls.combine_features,
                        uncombine_features: drawControls.uncombine_features,
                    },
                    // Add custom repeat modes to the available modes
                    modes: Object.assign({}, MapboxDraw.modes, customModes),
                    // Override styles to fix line-dasharray issues for MapLibre GL JS compatibility
                    styles: [
                        // Point styles
                        {
                            id: "gl-draw-point",
                            type: "circle",
                            filter: [
                                "all",
                                ["==", "$type", "Point"],
                                ["!=", "mode", "static"],
                            ],
                            paint: {
                                "circle-radius": 5,
                                "circle-color": "#3bb2d0",
                            },
                        },
                        // Line styles with fixed dasharray
                        {
                            id: "gl-draw-line",
                            type: "line",
                            filter: [
                                "all",
                                ["==", "$type", "LineString"],
                                ["!=", "mode", "static"],
                            ],
                            layout: {
                                "line-cap": "round",
                                "line-join": "round",
                            },
                            paint: {
                                "line-color": "#3bb2d0",
                                // "line-dasharray": ["literal", [0.2, 2]],
                                "line-width": 2,
                            },
                        },
                        // Polygon fill
                        {
                            id: "gl-draw-polygon-fill",
                            type: "fill",
                            filter: [
                                "all",
                                ["==", "$type", "Polygon"],
                                ["!=", "mode", "static"],
                            ],
                            paint: {
                                "fill-color": "#3bb2d0",
                                "fill-outline-color": "#3bb2d0",
                                "fill-opacity": 0.1,
                            },
                        },
                        // Polygon stroke
                        {
                            id: "gl-draw-polygon-stroke-active",
                            type: "line",
                            filter: [
                                "all",
                                ["==", "$type", "Polygon"],
                                ["!=", "mode", "static"],
                            ],
                            layout: {
                                "line-cap": "round",
                                "line-join": "round",
                            },
                            paint: {
                                "line-color": "#3bb2d0",
                                // "line-dasharray": ["literal", [0.2, 2]],
                                "line-width": 2,
                            },
                        },
                        // Active vertex (orange)
                        {
                            id: "gl-draw-polygon-and-line-vertex-active",
                            type: "circle",
                            filter: [
                                "all",
                                ["==", "meta", "vertex"],
                                ["==", "active", "true"],
                            ],
                            paint: {
                                "circle-radius": 6,
                                "circle-color": "#fbb03b",
                            },
                        },
                        // Inactive vertex (blue)
                        {
                            id: "gl-draw-polygon-and-line-vertex-inactive",
                            type: "circle",
                            filter: [
                                "all",
                                ["==", "meta", "vertex"],
                                ["==", "active", "false"],
                            ],
                            paint: {
                                "circle-radius": 5,
                                "circle-color": "#3bb2d0",
                            },
                        },
                        // Selected point feature (orange)
                        {
                            id: "gl-draw-point-active",
                            type: "circle",
                            filter: [
                                "all",
                                ["==", "$type", "Point"],
                                ["==", "active", "true"],
                            ],
                            paint: {
                                "circle-radius": 6,
                                "circle-color": "#fbb03b",
                            },
                        },
                        // Unselected point feature (blue)
                        {
                            id: "gl-draw-point-inactive",
                            type: "circle",
                            filter: [
                                "all",
                                ["==", "$type", "Point"],
                                ["==", "active", "false"],
                            ],
                            paint: {
                                "circle-radius": 5,
                                "circle-color": "#3bb2d0",
                            },
                        },
                    ],
                };

                // Merge provided options with defaults
                const drawOptions = { ...defaultOptions, ...options };

                // Create draw control
                const draw = new MapboxDraw(drawOptions);

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
                        geojson.features.forEach((feature) => {
                            draw.add(feature);
                        });
                    } else if (geojson.type === "Feature") {
                        draw.add(geojson);
                    }
                    updateDrawFeatures(map, draw);
                }

                // Set up draw event handlers
                setupDrawEventHandlers(map, draw);

                // Monitor repeat mode changes
                model.on("change:draw_repeat_mode", () => {
                    const repeatMode = model.get("draw_repeat_mode");
                    if (repeatMode) {
                        // Switch to repeat mode based on current mode
                        const currentMode = draw.getMode();
                        if (currentMode === "draw_polygon") {
                            draw.changeMode("repeat_polygon");
                        } else if (currentMode === "draw_line_string") {
                            draw.changeMode("repeat_line");
                        } else if (currentMode === "draw_point") {
                            draw.changeMode("repeat_point");
                        }
                    } else {
                        // Return to simple select mode
                        draw.changeMode("simple_select");
                    }
                });

                // Override draw button handlers to support repeat mode
                const drawContainer = document.querySelector(
                    ".maplibregl-ctrl-group .mapbox-gl-draw_ctrl-draw-btn"
                );
                if (drawContainer) {
                    // Add event listeners to draw buttons to check repeat mode
                    const polygonBtn = drawContainer.querySelector(
                        ".mapbox-gl-draw_polygon"
                    );
                    const lineBtn = drawContainer.querySelector(
                        ".mapbox-gl-draw_line"
                    );
                    const pointBtn = drawContainer.querySelector(
                        ".mapbox-gl-draw_point"
                    );

                    [polygonBtn, lineBtn, pointBtn].forEach((btn) => {
                        if (btn) {
                            btn.addEventListener("click", () => {
                                if (model.get("draw_repeat_mode")) {
                                    setTimeout(() => {
                                        const currentMode = draw.getMode();
                                        if (currentMode === "draw_polygon") {
                                            draw.changeMode("repeat_polygon");
                                        } else if (
                                            currentMode === "draw_line_string"
                                        ) {
                                            draw.changeMode("repeat_line");
                                        } else if (
                                            currentMode === "draw_point"
                                        ) {
                                            draw.changeMode("repeat_point");
                                        }
                                    }, 100);
                                }
                            });
                        }
                    });
                }
            } catch (err) {
                console.error("Failed to add draw control:", err);
            }
        }

        // Function to set up draw event handlers
        function setupDrawEventHandlers(map, draw) {
            map.on("draw.create", function (e) {
                console.log("Features created:", e.features);
                model.set("draw_features_created", e.features);
                updateDrawFeatures(map, draw);
                model.save_changes();
            });

            map.on("draw.update", function (e) {
                console.log("Features updated:", e.features);
                model.set("draw_features_updated", e.features);
                updateDrawFeatures(map, draw);
                model.save_changes();
            });

            map.on("draw.delete", function (e) {
                console.log("Features deleted:", e.features);
                model.set("draw_features_deleted", e.features);
                updateDrawFeatures(map, draw);
                model.save_changes();
            });

            map.on("draw.selectionchange", function (e) {
                console.log("Selection changed:", e.features);
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
                model.set("draw_feature_collection_all", {
                    type: "FeatureCollection",
                    features: [],
                });
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
                    const featureIds = allFeatures.features.map((f) => f.id);
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

        // Function to add legend control to the map
        function addLegendControlToMap(
            map,
            targets = {},
            options = {},
            position = "top-right"
        ) {
            // Check if MapboxLegendControl is available
            if (typeof MapboxLegendControl === "undefined") {
                console.log(
                    "MapboxLegendControl is not loaded. Loading now..."
                );
                loadMapboxLegend(() =>
                    addLegendControlToMap(map, targets, options, position)
                );
                return;
            }

            try {
                // Create legend control
                const legend = new MapboxLegendControl(targets, options);

                // Add control to map
                map.addControl(legend, position);
                console.log(`Added legend control at ${position}`);
                controlRegistry.set("legend", legend);
            } catch (err) {
                console.error("Failed to add legend control:", err);
            }
        }

        // Function to add opacity control to the map
        function addOpacityControlToMap(
            map,
            baseLayers = {},
            overLayers = {},
            options = {},
            position = "top-right",
            defaultVisibility = {}
        ) {
            // Check if OpacityControl is available
            if (typeof OpacityControl === "undefined") {
                console.log(
                    "OpacityControl is not loaded. Loading now..."
                );
                loadMaplibreOpacity(() =>
                    addOpacityControlToMap(map, baseLayers, overLayers, options, position, defaultVisibility)
                );
                return;
            }

            try {
                // Merge provided options with layer configurations
                const opacityOptions = {
                    baseLayers: baseLayers,
                    overLayers: overLayers,
                    opacityControl: true, // Default to showing opacity controls
                    ...options
                };

                // Handle collapsible functionality BEFORE adding the main control
                if (options.collapsible) {
                    addOpacityControlToggle(map, null, position);
                }

                // Create opacity control
                const opacity = new OpacityControl(opacityOptions);

                // Add control to map
                map.addControl(opacity, position);
                console.log(`Added opacity control at ${position}`);

                // IMPORTANT: Set default visibility AFTER the control is created
                // This overrides the plugin's default behavior of hiding overlay layers
                setTimeout(() => {
                    setLayerDefaultVisibility(map, baseLayers, overLayers, defaultVisibility);
                }, 100);

                controlRegistry.set("opacity", opacity);
            } catch (err) {
                console.error("Failed to add opacity control:", err);
            }
        }

        // Function to set default visibility for layers
        function setLayerDefaultVisibility(map, baseLayers, overLayers, defaultVisibility) {
            // Handle base layers - only first one visible by default unless specified
            const baseLayerIds = Object.keys(baseLayers);
            baseLayerIds.forEach((layerId, index) => {
                const visibility = defaultVisibility[layerId] !== undefined
                    ? (defaultVisibility[layerId] ? "visible" : "none")
                    : (index === 0 ? "visible" : "none"); // First base layer visible by default

                try {
                    if (map.getLayer(layerId)) {
                        map.setLayoutProperty(layerId, "visibility", visibility);
                        console.log(`Set ${layerId} visibility to ${visibility}`);

                        // Also update the checkbox/radio state to match
                        const control = document.getElementById(layerId);
                        if (control) {
                            control.checked = (visibility === "visible");
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to set visibility for ${layerId}:`, err);
                }
            });

            // Handle overlay layers - visible by default unless specified
            const overlayLayerIds = Object.keys(overLayers);
            overlayLayerIds.forEach((layerId) => {
                const visibility = defaultVisibility[layerId] !== undefined
                    ? (defaultVisibility[layerId] ? "visible" : "none")
                    : "visible"; // Overlays visible by default

                try {
                    if (map.getLayer(layerId)) {
                        map.setLayoutProperty(layerId, "visibility", visibility);
                        console.log(`Set ${layerId} visibility to ${visibility}`);

                        // Also update the checkbox state to match
                        const control = document.getElementById(layerId);
                        if (control) {
                            control.checked = (visibility === "visible");
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to set visibility for ${layerId}:`, err);
                }
            });
        }

        // Function to add toggle button for collapsible opacity control
        function addOpacityControlToggle(map, opacityControl, position) {
            // Create toggle button
            const toggleButton = document.createElement("button");
            toggleButton.innerHTML = "☰"; // Layer control icon
            toggleButton.title = "Toggle Layer Control";
            toggleButton.style.cssText = `
                background: white;
                border: 1px solid #ccc;
                border-radius: 3px;
                width: 30px;
                height: 30px;
                font-size: 16px;
                cursor: pointer;
                box-shadow: 0 0 0 0px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 0px;
            `;

            // Create wrapper for toggle functionality
            const toggleControl = {
                onAdd: function(map) {
                    this._map = map;
                    this._container = document.createElement('div');
                    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
                    this._container.appendChild(toggleButton);

                    // Toggle opacity control visibility
                    let isVisible = true;

                    toggleButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // Use a timeout to ensure the opacity control is rendered
                        setTimeout(() => {
                            // Find the opacity control element
                            const opacityContainer = document.getElementById('opacity-control') ||
                                document.querySelector('.maplibregl-ctrl-group:has(input[type="range"])') ||
                                document.querySelector('.maplibregl-ctrl-group:has(input[type="checkbox"])');

                            // console.log('Toggle clicked, opacity control found:', opacityContainer);

                            if (opacityContainer) {
                                if (isVisible) {
                                    opacityContainer.style.display = 'none';
                                    toggleButton.style.opacity = '0.6';
                                    toggleButton.title = 'Show Layer Control';
                                } else {
                                    opacityContainer.style.display = 'block';
                                    toggleButton.style.opacity = '1';
                                    toggleButton.title = 'Hide Layer Control';
                                }
                                isVisible = !isVisible;
                            } else {
                                console.warn('Opacity control not found for toggling');
                            }
                        }, 200);
                    });

                    return this._container;
                },
                onRemove: function() {
                    this._container.parentNode.removeChild(this._container);
                    this._map = undefined;
                }
            };

            // Add toggle control immediately
            map.addControl(toggleControl, position);
            controlRegistry.set("opacity-toggle", toggleControl);
            console.log('Toggle control added at position:', position);
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
