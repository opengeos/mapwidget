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

await loadScript("https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js");

export function render(view) {
    let center = view.model.get("center");
    center.reverse();
    let zoom = view.model.get("zoom");
    let width = view.model.get("width");
    let height = view.model.get("height");

    const div = document.createElement("div");
    div.style.width = width;
    div.style.height = height;

    var map = new maplibregl.Map({
        container: div,
        style: "https://demotiles.maplibre.org/style.json", // stylesheet location
        center: center, // starting position [lng, lat]
        zoom: zoom, // starting zoom
    });
    view.el.appendChild(div);
}
