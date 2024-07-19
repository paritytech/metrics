FROM node:22 as Builder

WORKDIR /action

COPY .yarn/ ./.yarn/
COPY package.json yarn.lock .yarnrc.yml ./

RUN yarn install --immutable --ignore-scripts

COPY . .

RUN yarn run build

FROM node:22-slim

COPY --from=Builder /action/dist /action

ENTRYPOINT ["node", "/action/index.js"]
