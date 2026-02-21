FROM node:20-slim
RUN npm install -g @solid/community-server@7.1.8
RUN mkdir -p /data/pods
WORKDIR /data
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8080
# NOTE: Pod storage is ephemeral — data is lost on container restart.
# For production, mount a persistent volume at /data/pods.
USER node
ENTRYPOINT ["/entrypoint.sh"]
