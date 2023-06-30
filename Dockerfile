FROM node:18.7.0-bullseye AS ui

WORKDIR /app

COPY . . 

RUN npm ci && npm run build

FROM nginx:latest

RUN rm -rf /usr/share/nginx/html/* && rm -rf /etc/nginx/nginx.conf

COPY ./nginx.conf /etc/nginx/nginx.conf

COPY --from=ui /app/dist /usr/share/nginx/html

EXPOSE 80