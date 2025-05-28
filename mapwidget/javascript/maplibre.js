import maplibregl from "https://esm.sh/maplibre-gl@5.5.0";

function render({ model, el }) {
    // Load CSS if missing
    if (!document.getElementById("maplibre-css")) {
        const link = document.createElement("link");
        link.id = "maplibre-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.css";
        document.head.appendChild(link);
    }

    // Prepare the outer container
    el.innerHTML = "";
    el.style.position = "relative";
    el.style.width = model.get("width") || "100%";
    el.style.height = model.get("height") || "600px";

    // Create and style map container
    const div = document.createElement("div");
    div.style.width = "100%";
    div.style.height = "100%";
    el.appendChild(div);

    let center = model.get("center").slice().reverse(); // [lng, lat]
    let zoom = model.get("zoom");

    const map = new maplibregl.Map({
        container: div,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: center,
        zoom: zoom,
    });

    map.on("click", function (e) {
        model.set("clicked_latlng", [e.lngLat.lat, e.lngLat.lng]);
        model.save_changes();
    });

    map.on("moveend", function () {
        const c = map.getCenter();
        const bbox = map.getBounds();
        model.set("center", [c.lat, c.lng]);
        model.set("bounds", [bbox.getWest(), bbox.getSouth(), bbox.getEast(), bbox.getNorth()]);
        model.save_changes();
    });

    map.on("zoomend", function () {
        const c = map.getCenter();
        const bbox = map.getBounds();
        model.set("center", [c.lat, c.lng]);
        model.set("zoom", map.getZoom());
        model.set("bounds", [bbox.getWest(), bbox.getSouth(), bbox.getEast(), bbox.getNorth()]);
        model.save_changes();
    });

    // Handle JS method calls from Python
    model.on("change:calls", () => {
        const calls = model.get("calls") || [];
        calls.forEach(({ method, args }) => {
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


    // Ensure the map fills the container fully
    setTimeout(() => {
        map.resize();
    }, 100);  // Delay to allow notebook layout to settle
}



export default { render };
