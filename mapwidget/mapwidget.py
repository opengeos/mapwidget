"""Main module."""

import anywidget
import traitlets

class Map(anywidget.AnyWidget):
    # Widget front-end JavaScript code. 
    # Credits to Trevor Manz for the sample code. See https://github.com/manzt/anywidget/issues/25

    _esm = """
    // import ESM version of Leaflet
    import * as L from "https://unpkg.com/leaflet@1.9.3/dist/leaflet-src.esm.js";
    export function render(view) {
            // create a div element
            let center = view.model.get("center");
            let zoom = view.model.get("zoom");
            
            const container = document.createElement("div");            
            container.style.height = "600px";
            
            // create a Leaflet map
            const map = L.map(container).setView(center, zoom);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
                maxZoom: 18,
            }).addTo(map);
            
            view.model.on("msg:custom", (msg) => {
                switch (msg.type) {
                    case "add_layer":
                        L.tileLayer(msg.url, { attribution: msg.attribution }).addTo(map);
                        break;
                    default:
                        console.err(`Unsupported message '${msg.type}'.`);
                }
                console.log(data);
            });
            view.el.appendChild(container);
        }
    """

    # make sure to include styles
    _css = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css"
    center = traitlets.List([40, -100]).tag(sync=True, o=True)
    zoom = traitlets.Int(4).tag(sync=True, o=True)

    # add a layer
    def add_layer(self, url=None):
        
        if url is None:
            url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
        
        self.send({"type": "add_layer", "url": url, "attribution": "Google"})