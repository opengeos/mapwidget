import mapboxgl from "https://esm.sh/mapbox-gl@2.13.0";

export function render(view) {
    let center = view.model.get("center");
    center.reverse();
    let zoom = view.model.get("zoom");
    let width = view.model.get("width");
    let height = view.model.get("height");

    const div = document.createElement("div");
    div.style.width = width;
    div.style.height = height;

    let token = view.model.get("token");

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
        container: div,
        style: "mapbox://styles/mapbox/streets-v12",
        center: center,
        zoom: zoom,
    });
    view.el.appendChild(div);
}
