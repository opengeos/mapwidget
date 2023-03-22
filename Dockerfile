FROM jupyter/base-notebook:latest
RUN pip install -U mapwidget && \
    fix-permissions "${CONDA_DIR}" && \
    fix-permissions "/home/${NB_USER}"

RUN mkdir ./examples
COPY docs/examples ./examples

USER root
RUN chown -R ${NB_UID} ${HOME}
USER ${NB_USER}