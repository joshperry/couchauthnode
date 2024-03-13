FROM alpine:3.10

RUN apk --no-cache add nodejs npm && \
	addgroup -g 1000 -S couchmail && \
    adduser -u 1000 -S couchmail -G couchmail && \
	mkdir -p /usr/src/app && \
	chown couchmail:couchmail /usr/src/app

WORKDIR /usr/src/app

USER couchmail

COPY ./ .

RUN npm install --production

ENTRYPOINT ["node", "."]
