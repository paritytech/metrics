FROM node:22 as Builder

WORKDIR /action

COPY package.json yarn.lock ./

RUN yarn install --immutable --ignore-scripts

COPY . .

RUN yarn run build

FROM node:22-slim

COPY --from=Builder /action/dist /action

ENTRYPOINT ["node", "/action/index.js"]
