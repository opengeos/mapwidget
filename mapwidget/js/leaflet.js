// import ESM version of Leaflet
import * as L from "https://unpkg.com/leaflet@1.9.3/dist/leaflet-src.esm.js";
export function render(view) {
    // Header
    let center = view.model.get("center");
    let zoom = view.model.get("zoom");
    let width = view.model.get("width");
    let height = view.model.get("height");

    const container = document.createElement("div");
    container.style.width = width;
    container.style.height = height;

    // Map content

    const map = L.map(container).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(map);

    map.on("click", function (e) {
        console.log("Clicked at:", e.latlng);
        view.model.set("clicked_latlng", [e.latlng.lat, e.latlng.lng]);
        view.model.save_changes();
    });

    map.on("moveend", function (e) {
        let center = map.getCenter();
        view.model.set("center", [center.lat, center.lng]);
        let bbox = map.getBounds();
        let bounds = [
            bbox._southWest.lng,
            bbox._southWest.lat,
            bbox._northEast.lng,
            bbox._northEast.lat,
        ];
        view.model.set("bounds", bounds);
        view.model.save_changes();
    });

    map.on("zoomend", function (e) {
        let center = map.getCenter();
        view.model.set("center", [center.lat, center.lng]);
        view.model.set("zoom", map.getZoom());
        let bbox = map.getBounds();
        let bounds = [
            bbox._southWest.lng,
            bbox._southWest.lat,
            bbox._northEast.lng,
            bbox._northEast.lat,
        ];
        view.model.set("bounds", bounds);
        view.model.save_changes();
    });

    view.model.on("msg:custom", (msg) => {
        switch (msg.type) {
            case "add_basemap":
                L.tileLayer(msg.url, msg).addTo(map);
                break;
            case "add_layer":
                L.tileLayer(msg.url, msg).addTo(map);
                break;
            default:
                console.err(`Unsupported message '${msg.type}'.`);
        }
    });

    // Footer
    view.el.appendChild(container);
}
