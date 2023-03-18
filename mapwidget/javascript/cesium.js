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

await loadScript(
    "https://cesium.com/downloads/cesiumjs/releases/1.103/Build/Cesium/Cesium.js"
);

export function render(view) {
    const div = document.createElement("div");
    div.style.width = "100%";
    div.style.height = "600px";

    Cesium.Ion.defaultAccessToken = view.model.get("token");

    const viewer = new Cesium.Viewer(div, {
        terrainProvider: Cesium.createWorldTerrain(),
    });

    const buildingTileset = viewer.scene.primitives.add(
        Cesium.createOsmBuildings()
    );

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-122.4175, 37.655, 400),
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-15.0),
        },
    });

    view.el.appendChild(div);
}
