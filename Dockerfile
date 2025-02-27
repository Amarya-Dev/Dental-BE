FROM node:18-bullseye-slim

RUN npm i npm@latest -g
RUN apt-get update && apt-get install -y netcat

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .
ENV PORT 4000
# ENV MYSQL_HOST 127.0.0.1
# ENV MYSQL_USER admin
# ENV MYSQL_PASSWORD mysql123
# ENV DATABASE dentalApp
# ENV PORT 4000
# ENV JWT_SECRET dentalInsightStudio#$#$#$#$
# ENV JWT_EXPIRATION_TIME 900000000000
# ENV NODEMAILER_USER amarya15consultancy@gmail.com
# ENV NODEMAILER_PASS cheb wcom lcgp ddtp
# ENV TOKENSECRET token@check
# ENV MAX_LOGINS 2
EXPOSE $PORT

CMD [ "node","app.js" ]