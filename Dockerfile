FROM alpine:3.8

WORKDIR /usr/src/app

RUN apk --no-cache add nodejs npm

COPY ./ .

RUN npm install --production

ENTRYPOINT ["npm", "start"]
