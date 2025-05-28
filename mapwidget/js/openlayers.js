function loadScript(src) {
    return new Promise((resolve, reject) => {
        let script = Object.assign(document.createElement("script"), {
            type: "text/javascript",
            async: true,
            src: src,
        });
        script.addEventListener("load", resolve);
        script.addEventListener("error", reject);
        document.body.appendChild(script);
    });
}

await loadScript("https://cdn.jsdelivr.net/npm/ol@v7.3.0/dist/ol.js");

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

    // Map content
    var map = new ol.Map({
        target: div,
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM(),
            }),
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat(center),
            zoom: zoom,
        }),
    });

    map.on("click", function (event) {
        var coordinate = event.coordinate;
        var lonLat = ol.proj.transform(coordinate, "EPSG:3857", "EPSG:4326");
        view.model.set("clicked_latlng", [lonLat[1], lonLat[0]]);
        view.model.save_changes();
    });

    map.on("moveend", function (event) {
        var center = map.getView().getCenter();
        var lonLat = ol.proj.transform(center, "EPSG:3857", "EPSG:4326");
        var zoomLevel = map.getView().getZoom();

        var extent = map.getView().calculateExtent(map.getSize());
        var lonLatExtent = ol.proj.transformExtent(
            extent,
            "EPSG:3857",
            "EPSG:4326"
        );
        view.model.set("bounds", lonLatExtent);

        view.model.set("center", [lonLat[1], lonLat[0]]);
        view.model.set("zoom", zoomLevel);
        view.model.save_changes();
    });

    // Footer
    view.el.appendChild(div);
}
