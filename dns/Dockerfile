FROM alpine:3.18

RUN apk add --no-cache dnsmasq

COPY dnsmasq.conf /etc/dnsmasq.conf

EXPOSE 53/udp 53/tcp

ENTRYPOINT ["dnsmasq", "-k", "--log-facility=-"]
