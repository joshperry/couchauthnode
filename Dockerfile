FROM node:18-alpine

WORKDIR /usr/src/app

COPY ./ .

RUN chown -R node:node /usr/src/app

USER node

RUN npm install --production

ENTRYPOINT ["npm", "start"]
