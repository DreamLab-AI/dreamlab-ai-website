FROM node:20-slim
RUN npm install -g @solid/community-server@7.1.8
RUN mkdir -p /data/pods && \
    printf '@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n<#authorization>\n    a               acl:Authorization;\n    acl:agentClass  foaf:Agent;\n    acl:mode        acl:Read, acl:Write, acl:Append, acl:Control;\n    acl:accessTo    <./>;\n    acl:default     <./>.\n' > /data/pods/.acl && \
    chown -R node:node /data
WORKDIR /data
COPY entrypoint.sh /entrypoint.sh
COPY seed.json /seed.json
COPY css-config.json /css-config.json
# Install custom config into the CSS package so @css: imports resolve correctly
RUN cp /css-config.json /usr/local/lib/node_modules/@solid/community-server/config/dreamlab.json
RUN chmod +x /entrypoint.sh && chown node:node /seed.json /css-config.json
EXPOSE 8080
# NOTE: Pod storage is ephemeral — data is lost on container restart.
# For production, mount a persistent volume at /data/pods.
USER node
ENTRYPOINT ["/entrypoint.sh"]
