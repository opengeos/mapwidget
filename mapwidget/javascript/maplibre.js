import maplibregl from "https://esm.sh/maplibre-gl@2.4.0";

export function render(view) {
    let center = view.model.get("center");
    center.reverse();
    let zoom = view.model.get("zoom");
    let width = view.model.get("width");
    let height = view.model.get("height");

    const div = document.createElement("div");
    div.style.width = width;
    div.style.height = height;

    const map = new maplibregl.Map({
        container: div,
        style: "https://demotiles.maplibre.org/style.json", // stylesheet location
        center: center, // starting position [lng, lat]
        zoom: zoom, // starting zoom
    });
    view.el.appendChild(div);
}
