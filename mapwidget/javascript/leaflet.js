// import ESM version of Leaflet
import * as L from "https://unpkg.com/leaflet@1.9.3/dist/leaflet-src.esm.js";
export function render(view) {
    // create a div element
    let center = view.model.get("center");
    let zoom = view.model.get("zoom");
    let width = view.model.get("width");
    let height = view.model.get("height");

    const container = document.createElement("div");
    container.style.width = width;
    container.style.height = height;

    // create a Leaflet map
    const map = L.map(container).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(map);

    view.model.on("msg:custom", (msg) => {
        switch (msg.type) {
            case "add_layer":
                L.tileLayer(msg.url, { attribution: msg.attribution }).addTo(
                    map
                );
                break;
            default:
                console.err(`Unsupported message '${msg.type}'.`);
        }
        console.log(data);
    });
    view.el.appendChild(container);
}
