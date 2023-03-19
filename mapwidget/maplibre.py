import os
import pathlib
import anywidget
import traitlets


class Map(anywidget.AnyWidget):
    """Map widget

    Args:
        anywidget (_type_): _description_
    """

    _cwd = os.path.dirname(os.path.abspath(__file__))
    _esm = pathlib.Path(os.path.join(_cwd, 'javascript', 'maplibre.js'))
    _css = pathlib.Path(os.path.join(_cwd, 'styles', 'maplibre.css'))
    center = traitlets.List([0, 20]).tag(sync=True, o=True)
    zoom = traitlets.Int(2).tag(sync=True, o=True)
    width = traitlets.Unicode('100%').tag(sync=True, o=True)
    height = traitlets.Unicode('600px').tag(sync=True, o=True)

    def set_esm(self, esm):
        """Set esm attribute. Can be a string, a file path, or a url.

        Args:
            esm (str): The esm string, file path, or url.

        Raises:
            TypeError: If esm is not a string.
        """
        if isinstance(esm, str):
            if os.path.isfile(esm):
                with open(esm, 'r') as f:
                    self._esm = f.read()
            elif esm.startswith('http'):
                import urllib.request

                with urllib.request.urlopen(esm) as response:
                    self._esm = response.read().decode('utf-8')
            else:
                self._esm = esm
        else:
            raise TypeError('esm must be a string')

    def set_css(self, css):
        """Set css attribute. Can be a string, a file path, or a url.

        Args:
            css (str): The css string, file path, or url.

        Raises:
            TypeError: If css is not a string.
        """
        if isinstance(css, str):
            if os.path.isfile(css):
                with open(css, 'r') as f:
                    self._css = f.read()
            elif css.startswith('http'):
                import urllib.request

                with urllib.request.urlopen(css) as response:
                    self._css = response.read().decode('utf-8')
            else:
                self._css = css
        else:
            raise TypeError('css must be a string')
