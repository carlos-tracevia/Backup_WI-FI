FROM nginx:alpine

# seu nginx.conf precisa ir para onde o Nginx realmente lê
COPY nginx.conf /etc/nginx/nginx.conf
COPY ssl-params.conf /etc/nginx/ssl-params.conf

RUN mkdir -p /etc/nginx/certs

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
