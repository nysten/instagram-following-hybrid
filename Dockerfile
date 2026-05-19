FROM apify/actor-node:22

COPY package.json ./
COPY .actor ./.actor
COPY src ./src

CMD ["npm", "run", "start"]
