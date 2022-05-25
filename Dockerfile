FROM node:16 as builder

WORKDIR /kz-nest-admin

COPY . .

# RUN npm set registry https://registry.npmmirror.com
RUN npm i -g pnpm
RUN pnpm install
# build
RUN npm run build

# httpserver set port
EXPOSE 5001
# websokcet set port
EXPOSE 5002

CMD ["npm", "run", "start:prod"]
