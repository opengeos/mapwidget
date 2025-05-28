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

        const map = new maplibregl.Map({
            container: div,
            style: "https://tiles.openfreemap.org/styles/liberty",
            center: center,
            zoom: zoom
        });

        map.on("click", function (e) {
            model.set("clicked_latlng", [e.lngLat.lng, e.lngLat.lat]);
            model.save_changes();
        });

        map.on("moveend", function () {
            const c = map.getCenter();
            const bbox = map.getBounds();
            model.set("center", [c.lng, c.lat]);
            model.set("bounds", [bbox.getWest(), bbox.getSouth(), bbox.getEast(), bbox.getNorth()]);
            updateModel(model, map);
            model.save_changes();
        });

        map.on("zoomend", function () {
            const c = map.getCenter();
            const bbox = map.getBounds();
            model.set("center", [c.lng, c.lat]);
            model.set("zoom", map.getZoom());
            model.set("bounds", [bbox.getWest(), bbox.getSouth(), bbox.getEast(), bbox.getNorth()]);
            updateModel(model, map);
            model.save_changes();
        });

        // Support JS calls from Python
        model.on("change:calls", () => {
            const calls = model.get("calls") || [];
            calls.forEach(({ method, args }) => {
                console.log(`Calling map.${method} with args: ${JSON.stringify(args)}`);
                if (typeof map[method] === "function") {
                    try {
                        map[method](...(args || []));
                    } catch (err) {
                        console.warn(`map.${method} failed`, err);
                    }
                } else {
                    console.warn(`map.${method} is not a function`);
                }
            });
            model.set("calls", []);
            model.save_changes();
        });

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
