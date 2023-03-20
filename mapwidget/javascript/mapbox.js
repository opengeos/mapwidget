import mapboxgl from "https://esm.sh/mapbox-gl@2.13.0";

export function render(view) {
    // Header
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

    // Map content

    const map = new mapboxgl.Map({
        container: div,
        style: "mapbox://styles/mapbox/streets-v12",
        center: center,
        zoom: zoom,
    });

    map.on("click", function (e) {
        view.model.set("clicked_latlng", [e.lngLat.lat, e.lngLat.lng]);
        view.model.save_changes();
    });

    map.on("moveend", function (e) {
        view.model.set("center", [map.getCenter().lat, map.getCenter().lng]);
        let bbox = map.getBounds();
        let bounds = [bbox._sw.lng, bbox._sw.lat, bbox._ne.lng, bbox._ne.lat];
        view.model.set("bounds", bounds);
        view.model.save_changes();
    });

    map.on("zoomend", function (e) {
        view.model.set("center", [map.getCenter().lat, map.getCenter().lng]);
        view.model.set("zoom", map.getZoom());
        let bbox = map.getBounds();
        let bounds = [bbox._sw.lng, bbox._sw.lat, bbox._ne.lng, bbox._ne.lat];
        view.model.set("bounds", bounds);
        view.model.save_changes();
    });

    // view.model.on("change:center", function () {
    //     let center = view.model.get("center");
    //     center.reverse();
    //     map.setCenter(center);
    // });

    // view.model.on("change:zoom", function () {
    //     let zoom = view.model.get("zoom");
    //     map.setZoom(zoom);
    // });

    // Footer
    view.el.appendChild(div);
}
