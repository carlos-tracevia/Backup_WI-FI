FROM debian:bookworm

ARG DEBIAN_FRONTEND=noninteractive
ARG ASTERISK_VERSION=18.11.0

# (opcional) força IPv4
RUN echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4

# 1) Primeiro update “tolerante” + instala os mínimos (certs+keyring)
RUN set -eux; \
  apt-get update -o Acquire::AllowInsecureRepositories=true || true; \
  apt-get install -y --no-install-recommends ca-certificates debian-archive-keyring || true; \
  rm -rf /var/lib/apt/lists/*

# 2) Agora segue normal (com assinaturas válidas)
RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    build-essential git wget curl subversion pkg-config \
    libssl-dev libxml2-dev libncurses5-dev uuid-dev libjansson-dev \
    libsqlite3-dev libedit-dev libsrtp2-dev libcurl4-openssl-dev \
    libopus-dev xmlstarlet tar xz-utils \
    unixodbc unixodbc-dev odbcinst1debian2 libodbc1 \
    odbc-mariadb \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

WORKDIR /usr/src
RUN wget https://downloads.asterisk.org/pub/telephony/asterisk/releases/asterisk-${ASTERISK_VERSION}.tar.gz && \
    tar xzf asterisk-${ASTERISK_VERSION}.tar.gz
WORKDIR /usr/src/asterisk-${ASTERISK_VERSION}

# (opcional) suporte a mp3 p/ MOH
RUN contrib/scripts/get_mp3_source.sh || true

# >>> CRÍTICO: desabilita XMLDOC no configure <<<
RUN ./configure --prefix=/usr --sysconfdir=/etc --libdir=/usr/lib \
    --with-pjproject-bundled \
    --disable-xmldoc

# Liga apenas o que precisamos (sem citar res_xmldoc)
RUN make menuselect.makeopts && \
    menuselect/menuselect \
      --enable res_srtp \
      --enable res_http_websocket \
      --enable codec_opus \
      menuselect.makeopts

# Compila/instala (não instala samples p/ não sobrescrever seu volume)
RUN make -j"$(nproc)" && \
    make install && \
    make config && \
    make -C doc -j"$(nproc)" xml-en_US || true

# Limpeza
RUN rm -rf /usr/src/*

EXPOSE 5060/udp 5061/tcp 8088/tcp 8089/tcp 5038/tcp 10000-10500/udp
CMD ["asterisk", "-f", "-U", "root"]
