FROM node:16-alpine

WORKDIR /usr/src
COPY package.json ./
#COPY yarn.lock ./
COPY src src
COPY templates templates
COPY config/docker.wsce.config.js config/wsce.config.js
COPY config/default.wsce.config.js config/default.wsce.config.js
COPY tsconfig.json ./

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN apk add chromium build-base python3 --no-cache
RUN yarn
RUN yarn build
RUN npm link

EXPOSE 9924
ENTRYPOINT [ "wsce", "start", "-v", "-y"]
